import { adminClient } from '@/lib/supabase/admin'
import { RegistrationsClient } from '@/components/admin/registrations-client'
import type { SelectedPackage, AdditionalField, CustomResponses } from '@/types/event'
import { eventRowPriceLabel, priceLabel, FREE_LABEL } from '@/lib/utils/money'
import { ageFromDob } from '@/lib/utils/age'

export const metadata = { title: 'Registrations — Admin' }

export type FlatRow = {
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

export type EventSummary = {
  id: string
  name: string
  slug: string
  event_date: string | null
  price_paise: number
  /** Resolved server-side so a package event reads "From ₹X", not "Free". */
  price_label: string
  is_free: boolean
  capacity: number | null
  status: string
  total_registrations: number
  confirmed_count: number
  checked_in_count: number
  cancelled_count: number
  /** Invite-only applications awaiting a decision. Computed in JS — see below. */
  applied_count: number
  /** Applications turned down. */
  rejected_count: number
  /** Registering on this event is a free application an admin approves. */
  invite_only: boolean
  /** First banner image, falling back to cover_url. Null when neither is set. */
  banner_url: string | null
}

export type RunnerRow = {
  user_id: string
  /** Joined from `users` — admin_registrations_flat doesn't carry it. */
  avatar_url: string | null
  full_name: string | null
  email: string | null
  username: string | null
  runner_tag: string | null
  runs_completed: number
  role: string
  confirmed_count: number
  checked_in_count: number
  last_event_name: string | null
  last_event_date: string | null
}

export type Attendee = {
  registration_id: string
  user_id: string
  full_name: string | null
  username: string | null
  runner_tag: string | null
  email: string | null
  status: string
  registered_at: string
  checked_in_at: string | null
  /** Packages bought, snapshotted at registration. Empty for non-package events. */
  packages: SelectedPackage[]
  amount_due_paise: number | null
  /** Answers to the event's custom questions, keyed by AdditionalField id. */
  custom_responses: CustomResponses
  // ── Profile columns, joined from `users` ──
  // Drives the tier badge, the contact line and the CSV export.
  avatar_url: string | null
  contact_number: string | null
  emergency_contact_number: string | null
  gender: string | null
  /**
   * Resolved server-side. Only the age reaches the browser — a date of birth is
   * a far stronger identifier than a year count, and nothing on this screen or
   * in the CSV needs it.
   */
  age: number | null
  location: string | null
  runs_completed: number
  role: string
}

export type EventWithAttendees = EventSummary & {
  attendees: Attendee[]
  /** Distinct package names across this event's attendees — drives the filter. */
  package_names: string[]
  /**
   * The event's custom questions, in the admin's authored order. Answers live
   * per attendee; the questions live here so a runner who skipped an optional
   * one still shows the question with a blank, and so the order is stable
   * across attendees rather than following JSON key order.
   */
  custom_fields: AdditionalField[]
}

export default async function AdminRegistrationsPage() {
  const [
    { data: flatRows },
    { data: eventSummaries },
    { data: packageRows },
    { data: eventPricingRows },
    { data: profileRows },
  ] = await Promise.all([
    adminClient
      .from('admin_registrations_flat')
      .select('*')
      .order('registered_at', { ascending: false }),
    adminClient
      .from('admin_event_summary')
      .select('*')
      .order('event_date', { ascending: false }),
    // Read straight from the table rather than adding these to
    // admin_registrations_flat: that view was created by hand and its definition
    // isn't in this repo, so widening it means dumping and re-authoring DDL we
    // can't see. Two narrow columns on an admin-only page is the cheaper trade.
    adminClient
      .from('event_registrations')
      .select('id, selected_packages, amount_due_paise, custom_responses'),
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
    adminClient
      .from('users')
      .select('id, avatar_url, contact_number, emergency_contact_number, gender, date_of_birth, location'),
  ])

  const rows = (flatRows ?? []) as FlatRow[]

  type PackageRow = {
    id: string
    selected_packages: string | null
    amount_due_paise: number | null
    custom_responses: string | null
  }
  const packageByRegistration = new Map<string, {
    packages: SelectedPackage[]
    amountDue: number | null
    customResponses: CustomResponses
  }>()
  for (const row of (packageRows ?? []) as PackageRow[]) {
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

    packageByRegistration.set(row.id, { packages, amountDue: row.amount_due_paise, customResponses })
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

  // Build runner summaries (unique users with aggregate stats)
  const runnerMap = new Map<string, RunnerRow>()
  for (const row of rows) {
    if (!runnerMap.has(row.user_id)) {
      runnerMap.set(row.user_id, {
        user_id: row.user_id,
        avatar_url: null,
        full_name: row.full_name,
        email: row.email,
        username: row.username,
        runner_tag: row.runner_tag,
        runs_completed: row.runs_completed,
        role: row.role,
        confirmed_count: 0,
        checked_in_count: 0,
        last_event_name: null,
        last_event_date: null,
      })
    }
    const runner = runnerMap.get(row.user_id)!
    if (row.status === 'CONFIRMED') {
      runner.confirmed_count++
      if (!runner.last_event_date || (row.event_date && row.event_date > runner.last_event_date)) {
        runner.last_event_name = row.event_name
        runner.last_event_date = row.event_date
      }
    }
    if (row.checked_in_at) runner.checked_in_count++
  }
  const runners = Array.from(runnerMap.values()).sort(
    (a, b) => b.confirmed_count - a.confirmed_count
  )

  type ProfileRow = {
    id: string
    avatar_url: string | null
    contact_number: string | null
    emergency_contact_number: string | null
    gender: string | null
    date_of_birth: string | null
    location: string | null
  }
  const profileByUser = new Map<string, ProfileRow>()
  for (const row of (profileRows ?? []) as ProfileRow[]) profileByUser.set(row.id, row)

  // Second pass: the runner summaries are built from the view, which has no
  // avatar. Filled here rather than reordering the reads above.
  for (const runner of runnerMap.values()) {
    runner.avatar_url = profileByUser.get(runner.user_id)?.avatar_url ?? null
  }

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

  const events: EventWithAttendees[] = ((eventSummaries ?? []) as EventSummary[]).map(e => {
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

  const totalUniqueRunners = runnerMap.size
  const totalCheckIns = runners.reduce((s, r) => s + r.checked_in_count, 0)

  return (
    <div>
      <h1 className='text-3xl font-bold text-white mb-2'>Registrations</h1>
      <p className='text-white/40 text-sm mb-8'>Master list of all runners and per-event breakdown.</p>

      {/* Summary cards */}
      <div className='grid grid-cols-3 gap-3 sm:gap-4 mb-8'>
        {[
          { label: 'Events', value: events.length },
          { label: 'Unique runners', value: totalUniqueRunners },
          { label: 'Check-ins', value: totalCheckIns },
        ].map(stat => (
          <div key={stat.label} className='bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5'>
            <p className='text-white/40 text-xs sm:text-sm'>{stat.label}</p>
            <p className='text-2xl sm:text-3xl font-bold text-stride-yellow-accent mt-1'>{stat.value}</p>
          </div>
        ))}
      </div>

      <RegistrationsClient
        runners={runners}
        events={events}
      />
    </div>
  )
}
