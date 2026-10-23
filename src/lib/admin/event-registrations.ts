import { adminClient } from '@/lib/supabase/admin'
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows'
import { eventRowPriceLabel, priceLabel, FREE_LABEL } from '@/lib/utils/money'
import { ageFromDob } from '@/lib/utils/age'
import type { SelectedPackage, AdditionalField, CustomResponses } from '@/types/event'
import type { EventSummary, Attendee, EventWithAttendees } from '@/types/admin-registrations'

type FlatRow = {
  registration_id: string
  status: string
  registered_at: string
  checked_in_at: string | null
  event_id: string
  event_name: string
  event_slug: string
  event_date: string | null
  price_paise: number
  capacity: number | null
  user_id: string
  full_name: string | null
  email: string | null
  username: string | null
  runner_tag: string | null
  runs_completed: number
  role: string
}

/** The two package/answer columns read straight from `event_registrations`. */
type PackageRow = {
  id: string
  selected_packages: string | null
  amount_due_paise: number | null
  custom_responses: string | null
  coupon_code: string | null
  coupon_percent: number | null
  discount_paise: number | null
}

/** Profile columns the `admin_registrations_flat` view doesn't carry. */
type ProfileRow = {
  id: string
  avatar_url: string | null
  contact_number: string | null
  emergency_contact_number: string | null
  gender: string | null
  date_of_birth: string | null
  location: string | null
}

/**
 * Events with their full attendee lists, for the admin Events tab. Keyed by
 * event id, and limited to `allowedEventIds` — the events the viewer may
 * manage — so a LEAD's page never receives an admin event's participants.
 *
 * Server-only: reads with the service-role client, which bypasses RLS, so the
 * caller MUST have run requireEventsAccess() and computed `allowedEventIds`
 * with canManageEvent first.
 */
export async function loadEventRegistrations(allowedEventIds: ReadonlySet<string>): Promise<Record<string, EventWithAttendees>> {
  // Every read that covers a whole table is paged. PostgREST stops an unpaged
  // select at db.max_rows (1000 here) with no error and no signal, so the joins
  // below silently dropped the profile and custom-answer rows past that mark and
  // rendered them as blanks. Each paged query carries a unique tiebreaker so the
  // windows can neither repeat nor skip a row.
  const [
    flatRows,
    { data: eventSummaries },
    packageRows,
    { data: eventPricingRows },
    profileRows,
  ] = await Promise.all([
    fetchAllRows<FlatRow>('registrations', (from, to) =>
      adminClient
        .from('admin_registrations_flat')
        .select('*')
        .order('registered_at', { ascending: false })
        .order('registration_id', { ascending: true })
        .range(from, to)
    ),
    adminClient
      .from('admin_event_summary')
      .select('*')
      .order('event_date', { ascending: false }),
    // Read straight from the table rather than adding these to
    // admin_registrations_flat: that view was created by hand and its definition
    // isn't in this repo, so widening it means dumping and re-authoring DDL we
    // can't see. Two narrow columns on an admin-only page is the cheaper trade.
    fetchAllRows<PackageRow>('registration extras', (from, to) =>
      adminClient
        .from('event_registrations')
        .select('id, selected_packages, amount_due_paise, custom_responses, coupon_code, coupon_percent, discount_paise')
        .order('id', { ascending: true })
        .range(from, to)
    ),
    // Same reasoning as above: admin_event_summary is a hand-authored view whose
    // DDL isn't in this repo, so the two package columns come straight from the
    // table and are joined in JS. Without them the price badge read "Free" for
    // every package event, since packages leave price_paise at 0.
    adminClient
      .from('events')
      .select('id, price_paise, packages, packages_enabled, invite_only, additional_fields, banner_images, cover_url'),
    // Profile columns the hand-authored admin_registrations_flat view doesn't
    // carry. Same trade as the two reads above: join in JS rather than re-author
    // DDL this repo can't see.
    fetchAllRows<ProfileRow>('member profiles', (from, to) =>
      adminClient
        .from('users')
        .select('id, avatar_url, contact_number, emergency_contact_number, gender, date_of_birth, location')
        .order('id', { ascending: true })
        .range(from, to)
    ),
  ])

  const rows = flatRows

  const packageByRegistration = new Map<string, {
    packages: SelectedPackage[]
    amountDue: number | null
    customResponses: CustomResponses
    couponCode: string | null
    couponPercent: number | null
    discountPaise: number | null
  }>()
  for (const row of packageRows) {
    let packages: SelectedPackage[] = []
    try { packages = JSON.parse(row.selected_packages ?? '[]') as SelectedPackage[] }
    catch { packages = [] }

    // Answers to the event's custom questions, keyed by field id. A malformed
    // value reads as "unanswered" rather than taking down the whole page.
    let customResponses: CustomResponses = {}
    try {
      const parsed = JSON.parse(row.custom_responses ?? '{}')
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        customResponses = parsed as CustomResponses
      }
    } catch { customResponses = {} }

    packageByRegistration.set(row.id, {
      packages,
      amountDue: row.amount_due_paise,
      customResponses,
      couponCode: row.coupon_code,
      couponPercent: row.coupon_percent,
      discountPaise: row.discount_paise,
    })
  }

  type PricingRow = { id: string; price_paise: number | null; packages: string | null; packages_enabled: boolean | null; invite_only: boolean | null; additional_fields: string | null; banner_images: string | null; cover_url: string | null }
  const priceLabelByEvent = new Map<string, { label: string; isFree: boolean; inviteOnly: boolean; bannerUrl: string | null }>()
  /** The event's custom questions, in the order the admin authored them. */
  const customFieldsByEvent = new Map<string, AdditionalField[]>()
  for (const row of (eventPricingRows ?? []) as PricingRow[]) {
    const label = eventRowPriceLabel(row.price_paise ?? 0, row.packages, row.packages_enabled)
    // Same precedence the public cards use: first banner, then cover_url.
    let bannerUrl: string | null = row.cover_url ?? null
    try {
      const banners = JSON.parse(row.banner_images ?? '[]') as string[]
      if (banners[0]) bannerUrl = banners[0]
    } catch { /* keep cover_url */ }

    priceLabelByEvent.set(row.id, {
      label,
      isFree: label === FREE_LABEL,
      inviteOnly: row.invite_only === true,
      bannerUrl,
    })

    let fields: AdditionalField[] = []
    try {
      const parsed = JSON.parse(row.additional_fields ?? '[]')
      if (Array.isArray(parsed)) fields = parsed as AdditionalField[]
    } catch { fields = [] }
    customFieldsByEvent.set(row.id, fields)
  }

  const profileByUser = new Map<string, ProfileRow>()
  for (const row of profileRows) profileByUser.set(row.id, row)

  // Build attendees per event
  const attendeesMap = new Map<string, Attendee[]>()
  for (const row of rows) {
    if (!attendeesMap.has(row.event_id)) attendeesMap.set(row.event_id, [])
    const bought = packageByRegistration.get(row.registration_id)
    const profile = profileByUser.get(row.user_id)
    attendeesMap.get(row.event_id)!.push({
      registration_id: row.registration_id,
      user_id: row.user_id,
      full_name: row.full_name,
      username: row.username,
      runner_tag: row.runner_tag,
      email: row.email,
      status: row.status,
      registered_at: row.registered_at,
      checked_in_at: row.checked_in_at,
      packages: bought?.packages ?? [],
      amount_due_paise: bought?.amountDue ?? null,
      coupon_code: bought?.couponCode ?? null,
      coupon_percent: bought?.couponPercent ?? null,
      discount_paise: bought?.discountPaise ?? null,
      custom_responses: bought?.customResponses ?? {},
      avatar_url: profile?.avatar_url ?? null,
      contact_number: profile?.contact_number ?? null,
      emergency_contact_number: profile?.emergency_contact_number ?? null,
      gender: profile?.gender ?? null,
      age: ageFromDob(profile?.date_of_birth ?? null),
      location: profile?.location ?? null,
      runs_completed: row.runs_completed,
      role: row.role,
    })
  }

  const events: EventWithAttendees[] = ((eventSummaries ?? []) as EventSummary[])
    .filter(e => allowedEventIds.has(e.id))
    .map(e => {
    const attendees = attendeesMap.get(e.id) ?? []
    const pricing = priceLabelByEvent.get(e.id)
    // Counted from the attendee rows rather than added to admin_event_summary:
    // that view is hand-authored and its DDL isn't in this repo, so widening it
    // would mean re-writing SQL we can't see. Same trade as the reads above.
    return {
      ...e,
      custom_fields: customFieldsByEvent.get(e.id) ?? [],
      applied_count: attendees.filter(a => a.status === 'APPLIED').length,
      rejected_count: attendees.filter(a => a.status === 'REJECTED').length,
      invite_only: pricing?.inviteOnly ?? false,
      banner_url: pricing?.bannerUrl ?? null,
      // admin_event_summary has no package columns, so the label is attached here
      // from the events table rather than derived from price_paise.
      price_label: pricing?.label ?? priceLabel(e.price_paise ?? 0),
      is_free: pricing?.isFree ?? (e.price_paise ?? 0) === 0,
      attendees,
      package_names: [...new Set(attendees.flatMap(a => a.packages.map(p => p.name)))].sort(),
    }
  })

  return Object.fromEntries(events.map(e => [e.id, e]))
}
