import { adminClient } from '@/lib/supabase/admin'
import { GraduationClient } from '@/components/admin/graduation-client'
import type { EventGraduations, GraduationRunner } from '@/components/admin/graduation-client'
import { getMilestone } from '@/lib/milestones'
import { requireFullAdmin } from '@/lib/auth/admin-access'
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows'

export const metadata = { title: 'Graduation — Admin' }

/** Registrations that will actually be run and can therefore credit a run. */
const COUNTABLE_STATUS = 'CONFIRMED'

type UserRow = {
  id: string
  full_name: string | null
  username: string | null
  email: string | null
  runner_tag: string | null
  avatar_url: string | null
  contact_number: string | null
  runs_completed: number
}

/**
 * Who crosses into a new milestone tier, and when.
 *
 * Tiers are derived from `users.runs_completed` — there's no tier column — so
 * everything here is computed in JS. The check-in flow (src/lib/check-in.ts)
 * adds exactly one run per confirmed check-in, and skips test events entirely,
 * which is what makes the projection below predictable.
 */
export default async function AdminGraduationPage(){
  // ADMIN only. A LEAD reaching this route is redirected to check-in.
  await requireFullAdmin()

  // Upcoming runs first: the registration read is scoped to them, so an old
  // event's few thousand rows never leave the database.
  const nowIso = new Date().toISOString()
  const { data: eventRows } = await adminClient
    .from('events')
    .select('id, name, slug, event_date')
    .eq('status', 'PUBLISHED')
    // A test event's check-in deliberately doesn't increment `runs_completed`,
    // so it can never graduate anyone and would only add noise here.
    .eq('is_test_event', false)
    .gte('event_date', nowIso)
    .order('event_date', { ascending: true })

  const upcomingEvents = eventRows ?? []
  const upcomingIds = upcomingEvents.map(e => e.id)

  const [users, { data: registrationRows }] = await Promise.all([
    // Paged: an unpaged select stops at db.max_rows (1000) with no error, which
    // would drop the lowest-run members — exactly the ones about to graduate.
    fetchAllRows<UserRow>('members', (from, to) =>
      adminClient
        .from('users')
        .select('id, full_name, username, email, runner_tag, avatar_url, contact_number, runs_completed')
        .order('runs_completed', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to)
    ),
    upcomingIds.length > 0
      ? adminClient
          .from('event_registrations')
          .select('user_id, event_id, checked_in_at')
          .eq('status', COUNTABLE_STATUS)
          .in('event_id', upcomingIds)
      : Promise.resolve({ data: [] as { user_id: string; event_id: string; checked_in_at: string | null }[] }),
  ])

  const userById = new Map(users.map(u => [u.id, u]))

  const runners: GraduationRunner[] = users.map(u => ({
    user_id: u.id,
    full_name: u.full_name,
    username: u.username,
    email: u.email,
    runner_tag: u.runner_tag,
    avatar_url: u.avatar_url,
    contact_number: u.contact_number,
    runs_completed: u.runs_completed ?? 0,
  }))

  // An already checked-in registration has had its run credited to
  // `runs_completed` already — counting it again would graduate people twice.
  const registrationsByEvent = new Map<string, string[]>()
  for (const reg of registrationRows ?? []) {
    if (reg.checked_in_at) continue
    const list = registrationsByEvent.get(reg.event_id) ?? []
    list.push(reg.user_id)
    registrationsByEvent.set(reg.event_id, list)
  }

  // Walk the calendar forward, carrying each runner's projected run count with
  // them. A runner signed up for three upcoming runs graduates at the one where
  // they actually cross the threshold, not at every one of them.
  const projectedRuns = new Map<string, number>()
  const events: EventGraduations[] = []

  for (const event of upcomingEvents) {
    const graduating: EventGraduations['runners'] = []

    for (const userId of registrationsByEvent.get(event.id) ?? []) {
      const user = userById.get(userId)
      if (!user) continue

      const before = projectedRuns.get(userId) ?? user.runs_completed ?? 0
      const after = before + 1
      projectedRuns.set(userId, after)

      if (getMilestone(after).key === getMilestone(before).key) continue

      graduating.push({
        user_id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        runner_tag: user.runner_tag,
        avatar_url: user.avatar_url,
        contact_number: user.contact_number,
        runs_completed: user.runs_completed ?? 0,
        runs_before: before,
        runs_after: after,
      })
    }

    if (graduating.length > 0) {
      events.push({
        event_id: event.id,
        name: event.name,
        slug: event.slug,
        event_date: event.event_date,
        runners: graduating,
      })
    }
  }

  return (
    <div>
      <h1 className='text-3xl font-bold text-white mb-2'>Graduation</h1>
      <p className='text-white/40 text-sm mb-8'>
        Runners about to cross into their next milestone tier — so nobody gets felicitated late.
      </p>

      <GraduationClient events={events} runners={runners} />
    </div>
  )
}
