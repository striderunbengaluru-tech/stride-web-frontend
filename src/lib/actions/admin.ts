'use server'

import { redirect } from 'next/navigation'
import { revalidatePath, revalidateTag } from 'next/cache'
import { nanoid } from 'nanoid'
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

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Always read role fresh from DB — JWT claims may hold stale values.
  const { data: row } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (row?.role !== 'ADMIN') redirect('/')
  return user
}

// ── Events ───────────────────────────────────────────────────────────────────

// Signature note: `_prev` is useActionState's previous-state argument. The form
// binds these with useActionState so a rejection can reach the UI as a toast
// without a page reload — the old redirect-with-?slug_error round trip threw
// away unsaved markdown and freshly uploaded banners.
export async function createEventAction(_prev: EventActionResult, formData: FormData): Promise<EventActionResult> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return firstFormIssue(parsed.error.issues)

  const { name, eventDate, endDate, locationUrl, postRunLocation, postRunLocationUrl, stravaRouteUrl, priceRupees, confirmationText, termsText, bannerImages, additionalFields, packages, packagesEnabled, packagesMultiSelect, distanceKm, difficulty, showSpotsLeft, isTestEvent, ...rest } = parsed.data
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
    ...rest,
  })

  revalidateEventCaches(slug)
  redirect('/admin/events')
}

// Purge every cache layer that serves event data: the tag-cached reads in
// src/lib/data/events.ts and the ISR'd /events listing page.
function revalidateEventCaches(slug: string | null) {
  // 'max' = expire immediately (Next 16 requires an explicit cache profile)
  revalidateTag(EVENTS_TAG, 'max')
  if (slug) {
    revalidateTag(eventTag(slug), 'max')
    revalidatePath(`/events/${slug}`)
  }
  revalidatePath('/events')
}

export async function updateEventAction(id: string, _prev: EventActionResult, formData: FormData): Promise<EventActionResult> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return firstFormIssue(parsed.error.issues)

  const { name, eventDate, endDate, locationUrl, postRunLocation, postRunLocationUrl, stravaRouteUrl, priceRupees, confirmationText, termsText, bannerImages, additionalFields, packages, packagesEnabled, packagesMultiSelect, distanceKm, difficulty, showSpotsLeft, isTestEvent, capacity, ...rest } = parsed.data

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
    updated_at: new Date().toISOString(),
    ...rest,
  }).eq('id', id).select('slug').single()

  // Spots-left, the register route's capacity read and the packages the modal
  // offers all come from cached event reads — purge them so a capacity increase
  // is visible to runners immediately rather than up to 60s later.
  revalidateEventCaches(updated?.slug ?? null)
  revalidateTag(eventRegsTag(id), 'max')
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

  if (!['GUEST', 'MEMBER', 'ADMIN'].includes(role)) return

  // The club must always keep at least one administrator.
  if (role !== 'ADMIN' && await isLastAdmin(userId)) {
    return { error: 'This is the only admin account. Promote another member to admin before removing this one.' }
  }

  await adminClient.from('users').update({
    role,
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

  redirect('/admin/users')
}
