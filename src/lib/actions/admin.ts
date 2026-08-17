'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { revalidatePath, updateTag } from 'next/cache'
import { nanoid } from 'nanoid'
import { sendConfirmationEmailOnce } from '@/lib/email/send-hooks'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { EVENTS_TAG, eventTag, eventRegsTag } from '@/lib/data/events'
import { eventSchema, productSchema, additionalFieldSchema, eventPackageSchema, EVENT_FIELD_ORDER, type EventActionResult } from '@/lib/validations/admin'
import { MAX_PACKAGES, hasSpotBudget, type EventPackage, type SelectedPackage } from '@/types/event'
import { slugify } from '@/lib/utils/slug'
import { istLocalToUtcIso } from '@/lib/utils/ist'
import { isLastAdmin } from '@/lib/account/hard-delete'

// Validates the JSON-encoded additional fields string from the form.
// Returns a canonical JSON string ('[]' on any error) — never blocks the save.
// Entries are validated one at a time on purpose: parsing the array as a whole
// meant a single malformed question (e.g. a dropdown saved with no options)
// silently wiped every other question on the event.
function sanitiseAdditionalFields(raw: string | undefined): string {
  if (!raw) return '[]'
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return '[]'
    const clean = parsed.flatMap(entry => {
      const result = additionalFieldSchema.safeParse(entry)
      return result.success ? [result.data] : []
    })
    return JSON.stringify(clean)
  } catch { return '[]' }
}

// Same contract as sanitiseAdditionalFields, including the per-entry validation:
// one malformed package must not wipe the rest. Capped at MAX_PACKAGES so a
// hand-posted form can't make the registration modal unusable.
function sanitisePackages(raw: string | undefined): string {
  if (!raw) return '[]'
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return '[]'
    const clean = parsed.flatMap(entry => {
      const result = eventPackageSchema.safeParse(entry)
      return result.success ? [result.data] : []
    })
    return JSON.stringify(clean.slice(0, MAX_PACKAGES))
  } catch { return '[]' }
}

// Enabling packages with nothing authored would leave the event unregisterable:
// the register route requires a selection, and there'd be nothing to select. So
// the flag can only be true when at least one package survived validation.
function packageColumns(rawPackages: string | undefined, enabled: boolean, multiSelect: boolean) {
  const packages = sanitisePackages(rawPackages)
  return {
    packages,
    packages_enabled: enabled && packages !== '[]',
    packages_multi_select: multiSelect,
  }
}

// ── Event action results ─────────────────────────────────────────────────────
// EventActionResult is declared in @/lib/validations/admin. Returning it rather
// than throwing is deliberate: Next.js masks thrown server-action messages in
// production, and these are messages the admin must be able to read.

// Picks the topmost problem so the toast names the field the admin will fix
// first. Zod reports issues in schema-key order, which is not the order the
// fields appear on screen.
function firstFormIssue(issues: readonly { path: readonly PropertyKey[]; message: string }[]): { error: string; field?: string } {
  const order = EVENT_FIELD_ORDER as readonly string[]
  const rank = (issue: { path: readonly PropertyKey[] }) => {
    const idx = order.indexOf(String(issue.path[0] ?? ''))
    return idx === -1 ? order.length : idx
  }
  const top = [...issues].sort((a, b) => rank(a) - rank(b))[0]
  if (!top) return { error: 'Please check the form and try again.' }
  const field = String(top.path[0] ?? '')
  return { error: top.message, field: field || undefined }
}

function parsePackages(raw: string | null | undefined): EventPackage[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as EventPackage[]) : []
  } catch { return [] }
}

// Registrations that hold a spot: confirmed, plus in-checkout holds younger than
// the 15-minute window register_for_event reserves. Mirrors the RPC exactly so
// the admin form and the registration guard agree on "taken".
const HOLD_WINDOW_MS = 15 * 60 * 1000

/**
 * How many spots each package has taken, keyed by package id. Read from the
 * `selected_packages` snapshots so it survives package renames and price edits.
 */
async function packageSpotsTaken(eventId: string): Promise<Record<string, number>> {
  const { data } = await adminClient
    .from('event_registrations')
    .select('status, created_at, selected_packages')
    .eq('event_id', eventId)
    .not('selected_packages', 'is', null)

  const cutoff = Date.now() - HOLD_WINDOW_MS
  const taken: Record<string, number> = {}

  for (const row of data ?? []) {
    const holds = row.status === 'CONFIRMED'
      || (row.status === 'PENDING' && new Date(row.created_at as string).getTime() > cutoff)
    if (!holds) continue

    let chosen: SelectedPackage[] = []
    try {
      const parsed = JSON.parse(row.selected_packages as string)
      if (Array.isArray(parsed)) chosen = parsed as SelectedPackage[]
    } catch { continue }

    for (const pkg of chosen) {
      taken[pkg.id] = (taken[pkg.id] ?? 0) + 1
    }
  }

  return taken
}

/**
 * Guards the two ways an edit can strand people who have already registered:
 * dropping the event's capacity below the confirmed head-count, or dropping a
 * package's spots below what that package has already sold.
 *
 * INCREASES ARE ALWAYS ALLOWED — including on a live, sold-out event. That is
 * the whole point: the club regularly opens more spots on a full run.
 */
async function validateCapacityReduction(
  eventId: string,
  nextCapacity: number,
  nextPackages: EventPackage[],
): Promise<{ error: string; field?: string } | null> {
  const { data: current } = await adminClient
    .from('events')
    .select('capacity, packages')
    .eq('id', eventId)
    .single()

  const currentCapacity = current?.capacity as number | null | undefined
  const currentPackages = parsePackages(current?.packages as string | null)

  const capacityDropped = currentCapacity == null || nextCapacity < currentCapacity
  const anyPackageDropped = nextPackages.some(next => {
    const before = currentPackages.find(p => p.id === next.id)
    if (!before || !hasSpotBudget(before)) return false
    return (next.spotsTotal ?? 0) < (before.spotsTotal ?? 0)
  })

  // Nothing shrank — skip the counting queries entirely.
  if (!capacityDropped && !anyPackageDropped) return null

  if (capacityDropped) {
    const { count } = await adminClient
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'CONFIRMED')

    const confirmed = count ?? 0
    if (nextCapacity < confirmed) {
      return {
        error: `Capacity ${nextCapacity} is below the ${confirmed} ${confirmed === 1 ? 'runner' : 'runners'} already confirmed. Raise it, or cancel registrations first.`,
        field: 'capacity',
      }
    }
  }

  if (anyPackageDropped) {
    const taken = await packageSpotsTaken(eventId)
    for (const pkg of nextPackages) {
      const used = taken[pkg.id] ?? 0
      if (hasSpotBudget(pkg) && (pkg.spotsTotal ?? 0) < used) {
        return {
          error: `"${pkg.name}" already has ${used} ${used === 1 ? 'registration' : 'registrations'} — its spots can't go below that.`,
          field: 'packages',
        }
      }
    }
  }

  return null
}

/**
 * Gate every admin write. Returns the acting admin plus a display-name snapshot
 * for the attribution columns (`events.created_by/updated_by`,
 * `event_registrations.decided_by`) — a name rather than an id, so the trail
 * survives hardDeleteUser() erasing the users row.
 */
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Always read role fresh from DB — JWT claims may hold stale values.
  const { data: row } = await adminClient
    .from('users')
    .select('role, full_name, username')
    .eq('id', user.id)
    .single()

  if (row?.role !== 'ADMIN') redirect('/')

  const actorName: string =
    (row.full_name as string | null)?.trim() ||
    (row.username as string | null) ||
    user.email ||
    'Admin'

  return { user, actorName }
}

// ── Events ───────────────────────────────────────────────────────────────────

// Signature note: `_prev` is useActionState's previous-state argument. The form
// binds these with useActionState so a rejection can reach the UI as a toast
// without a page reload — the old redirect-with-?slug_error round trip threw
// away unsaved markdown and freshly uploaded banners.
export async function createEventAction(_prev: EventActionResult, formData: FormData): Promise<EventActionResult> {
  const { actorName } = await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return firstFormIssue(parsed.error.issues)

  const { name, eventDate, endDate, locationUrl, postRunLocation, postRunLocationUrl, stravaRouteUrl, priceRupees, confirmationText, termsText, bannerImages, additionalFields, packages, packagesEnabled, packagesMultiSelect, distanceKm, difficulty, showSpotsLeft, isTestEvent, inviteOnly, registrationsClosed, ...rest } = parsed.data
  const id = nanoid()
  const slug = slugify(name)

  const { data: existing } = await adminClient
    .from('events')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return { error: `"${name}" is already taken — try a more specific name.`, field: 'name' }
  }

  await adminClient.from('events').insert({
    id,
    name,
    slug,
    // The form posts a bare wall clock; the admin means IST. new Date() on it
    // would read it as server-local (UTC on Vercel) and shift the run 5h30 late.
    event_date: istLocalToUtcIso(eventDate),
    end_date: istLocalToUtcIso(endDate),
    location_url: locationUrl || null,
    post_run_location: postRunLocation?.trim() || null,
    post_run_location_url: postRunLocationUrl || null,
    strava_route_url: stravaRouteUrl || null,
    price_paise: Math.round((priceRupees ?? 0) * 100),
    confirmation_text: confirmationText || null,
    terms_and_conditions: termsText || null,
    banner_images: bannerImages ?? '[]',
    additional_fields: sanitiseAdditionalFields(additionalFields),
    ...packageColumns(packages, packagesEnabled, packagesMultiSelect),
    distance_km: distanceKm ?? null,
    difficulty: difficulty?.trim() || null,
    show_spots_left: showSpotsLeft,
    is_test_event: isTestEvent,
    invite_only: inviteOnly,
    registrations_closed: registrationsClosed,
    ...rest,
    // AFTER the spread, deliberately. Both actions spread parsed form data
    // straight into the row, so attribution set before it could be overridden
    // by a hand-posted field of the same name.
    created_by: actorName,
    updated_by: actorName,
  })

  revalidateEventCaches(slug)
  redirect('/admin/events')
}

// Purge every cache layer that serves event data: the tag-cached reads in
// src/lib/data/events.ts and the ISR'd /events listing page.
function revalidateEventCaches(slug: string | null) {
  // updateTag, not revalidateTag(tag, 'max'). They are not the same thing and
  // the difference is visible to admins: 'max' is a stale-while-revalidate
  // profile, so the tagged read keeps serving its old value and refreshes in
  // the background. revalidatePath below would then re-render the page against
  // that stale value and cache the result, and the edit only surfaced when the
  // page's own ISR window elapsed -- measured at 20-30 seconds on a preview
  // deploy. updateTag expires the entry outright, so the very next render reads
  // through to the database.
  //
  // These are Server Actions, which is the only context updateTag allows. The
  // registration route handlers cannot use it and pass an explicit
  // { expire: 0 } profile instead.
  updateTag(EVENTS_TAG)
  if (slug) {
    updateTag(eventTag(slug))
    revalidatePath(`/events/${slug}`)
  }
  revalidatePath('/events')
  // The homepage renders <UpNextSection/>. Its data is tag-cached but the page
  // HTML is not, so without this a freshly toggled event keeps its old badge
  // state up top until the homepage's own ISR window elapses.
  revalidatePath('/')
}

export async function updateEventAction(id: string, _prev: EventActionResult, formData: FormData): Promise<EventActionResult> {
  const { actorName } = await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return firstFormIssue(parsed.error.issues)

  const { name, eventDate, endDate, locationUrl, postRunLocation, postRunLocationUrl, stravaRouteUrl, priceRupees, confirmationText, termsText, bannerImages, additionalFields, packages, packagesEnabled, packagesMultiSelect, distanceKm, difficulty, showSpotsLeft, isTestEvent, inviteOnly, registrationsClosed, capacity, ...rest } = parsed.data

  const packageColumnValues = packageColumns(packages, packagesEnabled, packagesMultiSelect)

  const reduction = await validateCapacityReduction(
    id,
    capacity,
    packageColumnValues.packages_enabled ? parsePackages(packageColumnValues.packages) : [],
  )
  if (reduction) return reduction

  const { data: updated } = await adminClient.from('events').update({
    name,
    // The form posts a bare wall clock; the admin means IST. new Date() on it
    // would read it as server-local (UTC on Vercel) and shift the run 5h30 late.
    event_date: istLocalToUtcIso(eventDate),
    end_date: istLocalToUtcIso(endDate),
    location_url: locationUrl || null,
    post_run_location: postRunLocation?.trim() || null,
    post_run_location_url: postRunLocationUrl || null,
    strava_route_url: stravaRouteUrl || null,
    price_paise: Math.round((priceRupees ?? 0) * 100),
    confirmation_text: confirmationText || null,
    terms_and_conditions: termsText || null,
    banner_images: bannerImages ?? '[]',
    additional_fields: sanitiseAdditionalFields(additionalFields),
    ...packageColumnValues,
    capacity,
    distance_km: distanceKm ?? null,
    difficulty: difficulty?.trim() || null,
    show_spots_left: showSpotsLeft,
    is_test_event: isTestEvent,
    invite_only: inviteOnly,
    registrations_closed: registrationsClosed,
    updated_at: new Date().toISOString(),
    ...rest,
    // After the spread — see the note in createEventAction.
    updated_by: actorName,
  }).eq('id', id).select('slug').single()

  // Spots-left, the register route's capacity read and the packages the modal
  // offers all come from cached event reads — purge them so a capacity increase
  // is visible to runners immediately rather than up to 60s later.
  revalidateEventCaches(updated?.slug ?? null)
  updateTag(eventRegsTag(id))
  redirect('/admin/events')
}

const STORAGE_URL_PREFIX = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/'

export async function deleteEventAction(id: string): Promise<void> {
  await requireAdmin()

  // Fetch banner images (for storage cleanup) and slug (for cache purge)
  // before deleting the row
  const { data: event } = await adminClient
    .from('events')
    .select('banner_images, slug')
    .eq('id', id)
    .single()

  const bannerUrls: string[] = (() => {
    try { return JSON.parse(event?.banner_images ?? '[]') as string[] }
    catch { return [] }
  })()

  const storagePaths = bannerUrls
    .filter(url => url.startsWith(STORAGE_URL_PREFIX))
    .map(url => url.slice(STORAGE_URL_PREFIX.length))
    .filter(p => p.startsWith('images/events/'))

  if (storagePaths.length > 0) {
    await adminClient.storage.from('stride-assets').remove(storagePaths)
  }

  await adminClient.from('events').delete().eq('id', id)
  revalidateEventCaches(event?.slug ?? null)
  redirect('/admin/events')
}

// ── Registrations (invite-only decisions) ────────────────────────────────────

/**
 * Most ids a single decision may carry.
 *
 * Not arbitrary: each approval fans out one Brevo send, and an unbounded batch
 * risks the function timing out mid-fan-out — which leaves rows confirmed and
 * un-emailed. The client paginates larger selections into successive calls.
 */
const MAX_DECISION_IDS = 50

export type DecisionResult =
  | {
      ok: true
      /** Ids this call actually moved. Only these are emailed. */
      decided: string[]
      /** Left alone because someone else got there first. */
      alreadyDecided: string[]
      /** APPLIED, but the event ran out of seats. Approve only. */
      skippedCapacity: string[]
      capacity: number | null
      confirmedAfter: number
    }
  | { ok: false; error: string }

type Preflight =
  | { ok: false; error: string }
  | { ok: true; actorName: string; ids: string[] }

/** Shared guard: admin session, then a sane, deduped id list scoped to one event. */
async function decisionPreflight(eventId: string, ids: string[]): Promise<Preflight> {
  const { actorName } = await requireAdmin()

  if (typeof eventId !== 'string' || !eventId.trim()) {
    return { ok: false, error: 'Missing event.' }
  }

  const clean = [...new Set((Array.isArray(ids) ? ids : []).filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0,
  ))]

  if (clean.length === 0) return { ok: false, error: 'Nothing selected.' }
  if (clean.length > MAX_DECISION_IDS) {
    return { ok: false, error: `Select at most ${MAX_DECISION_IDS} applications at a time.` }
  }

  return { ok: true, actorName, ids: clean }
}

/** Slug + live confirmed count, for the cache purge and the toast copy. */
async function eventDecisionContext(eventId: string) {
  const [{ data: event }, { count }] = await Promise.all([
    adminClient.from('events').select('slug, capacity').eq('id', eventId).maybeSingle(),
    adminClient
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'CONFIRMED'),
  ])

  return {
    slug: (event?.slug as string | null) ?? null,
    capacity: (event?.capacity as number | null) ?? null,
    confirmed: count ?? 0,
  }
}

/**
 * Approve invite-only applications in bulk and send each one the selection
 * email.
 *
 * `eventId` is a required parameter rather than something derived from the ids:
 * the capacity budget is per event, and a list spanning two events could not be
 * capped correctly. The cap itself lives in the `approve_registrations` SQL
 * function, under the event row lock — doing it here would reintroduce the
 * read-then-write race the schema already closes for registration and payment.
 */
export async function approveRegistrationsAction(eventId: string, ids: string[]): Promise<DecisionResult> {
  const pre = await decisionPreflight(eventId, ids)
  if (!pre.ok) return pre

  const { data, error } = await adminClient.rpc('approve_registrations', {
    p_event_id: eventId,
    p_registration_ids: pre.ids,
    p_decided_by: pre.actorName,
  })

  if (error) {
    console.error('[Admin] approve_registrations failed', error)
    return { ok: false, error: 'Could not approve those applications. Please try again.' }
  }

  const rows = (data ?? []) as { registration_id: string; outcome: string }[]
  const withOutcome = (outcome: string) =>
    rows.filter(r => r.outcome === outcome).map(r => r.registration_id)

  // These arrive uniformly for every id — the whole batch was refused.
  const blocked = rows[0]?.outcome
  if (blocked === 'EVENT_NOT_FOUND') return { ok: false, error: 'That event no longer exists.' }
  if (blocked === 'EVENT_NOT_PUBLISHED') return { ok: false, error: 'Publish the event before approving applications.' }
  if (blocked === 'EVENT_CONCLUDED') return { ok: false, error: 'This run has already happened — approving would email a ticket for a finished event.' }

  const approved = withOutcome('APPROVED')
  const context = await eventDecisionContext(eventId)

  // Purged synchronously: an after() callback runs once the response is gone,
  // so the admin's next read would still see the stale confirmed count.
  updateTag(eventRegsTag(eventId))
  if (context.slug) revalidatePath(`/events/${context.slug}`)
  revalidatePath('/admin/registrations')
  revalidatePath('/admin/events')

  if (approved.length > 0) {
    // Only ids THIS call promoted — never the already-confirmed ones. The claim
    // inside sendConfirmationEmailOnce is the second layer. Chunked rather than
    // one big Promise.all so a 50-row approve doesn't hammer Brevo at once.
    after(async () => {
      for (let i = 0; i < approved.length; i += 5) {
        await Promise.allSettled(
          approved.slice(i, i + 5).map(id => sendConfirmationEmailOnce(id, 'selected')),
        )
      }
    })
  }

  return {
    ok: true,
    decided: approved,
    alreadyDecided: [...withOutcome('ALREADY_CONFIRMED'), ...withOutcome('NOT_APPLIED'), ...withOutcome('NOT_FOUND')],
    skippedCapacity: withOutcome('CAPACITY_FULL'),
    capacity: context.capacity,
    confirmedAfter: context.confirmed,
  }
}

/**
 * Reject invite-only applications in bulk. No email, by product decision — the
 * "Not selected" state in My Runs is the whole notification.
 *
 * No SQL function needed: rejection touches no shared budget, so one
 * conditional UPDATE is already atomic. `.eq('status','APPLIED')` is the whole
 * story — it makes this a compare-and-swap, so a row another admin approved a
 * moment earlier is left alone rather than clobbered.
 *
 * Deliberately cannot un-approve a CONFIRMED row: the ticket email has gone out
 * and a wallet pass may already be on the runner's phone.
 */
export async function rejectRegistrationsAction(eventId: string, ids: string[]): Promise<DecisionResult> {
  const pre = await decisionPreflight(eventId, ids)
  if (!pre.ok) return pre

  const now = new Date().toISOString()
  const { data, error } = await adminClient
    .from('event_registrations')
    .update({ status: 'REJECTED', decided_at: now, decided_by: pre.actorName, updated_at: now })
    .eq('event_id', eventId)
    .in('id', pre.ids)
    .eq('status', 'APPLIED')
    .select('id')

  if (error) {
    console.error('[Admin] reject registrations failed', error)
    return { ok: false, error: 'Could not reject those applications. Please try again.' }
  }

  const rejected = (data ?? []).map(r => r.id as string)
  const rejectedSet = new Set(rejected)

  // No eventRegsTag purge: rejecting changes no confirmed count and frees no
  // package spot, so nothing the public event page caches has moved.
  revalidatePath('/admin/registrations')
  revalidatePath('/admin/events')

  const context = await eventDecisionContext(eventId)

  return {
    ok: true,
    decided: rejected,
    alreadyDecided: pre.ids.filter(id => !rejectedSet.has(id)),
    skippedCapacity: [],
    capacity: context.capacity,
    confirmedAfter: context.confirmed,
  }
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function createProductAction(formData: FormData): Promise<void> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) return

  const { pricePaise, imageUrl, ...rest } = parsed.data
  const id = nanoid()
  const slug = slugify(parsed.data.name)

  await adminClient.from('products').insert({
    id,
    slug,
    price_paise: pricePaise,
    image_url: imageUrl || null,
    ...rest,
  })

  redirect('/admin/products')
}

export async function updateProductAction(id: string, formData: FormData): Promise<void> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) return

  const { pricePaise, imageUrl, ...rest } = parsed.data

  await adminClient.from('products').update({
    price_paise: pricePaise,
    image_url: imageUrl || null,
    updated_at: new Date().toISOString(),
    ...rest,
  }).eq('id', id)

  redirect('/admin/products')
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireAdmin()
  await adminClient.from('products').delete().eq('id', id)
  redirect('/admin/products')
}

// ── Users ─────────────────────────────────────────────────────────────────────

// Returns { error } instead of throwing — Next.js masks thrown server-action
// error messages in production, and the last-admin refusal must be readable.
export async function updateUserRoleAction(userId: string, role: string): Promise<{ error: string } | void> {
  await requireAdmin()

  if (!['GUEST', 'MEMBER', 'LEAD', 'ADMIN'].includes(role)) return

  // The club must always keep at least one administrator. LEAD does not satisfy
  // this — a lead cannot reach the users page to promote anyone, so demoting
  // the last admin to lead would lock the club out of its own portal.
  if (role !== 'ADMIN' && await isLastAdmin(userId)) {
    return { error: 'This is the only admin account. Promote another member to admin before removing this one.' }
  }

  await adminClient.from('users').update({
    role,
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

  redirect('/admin/users')
}
