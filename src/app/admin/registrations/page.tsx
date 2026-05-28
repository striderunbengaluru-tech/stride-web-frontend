import { adminClient } from '@/lib/supabase/admin'
import { RegistrationsClient } from '@/components/admin/registrations-client'

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
  capacity: number | null
  status: string
  total_registrations: number
  confirmed_count: number
  checked_in_count: number
  cancelled_count: number
}

export type RunnerRow = {
  user_id: string
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

export type EventWithAttendees = EventSummary & {
  attendees: {
    registration_id: string
    user_id: string
    full_name: string | null
    runner_tag: string | null
    email: string | null
    status: string
    registered_at: string
    checked_in_at: string | null
  }[]
}

export default async function AdminRegistrationsPage() {
  const [{ data: flatRows }, { data: eventSummaries }] = await Promise.all([
    adminClient
      .from('admin_registrations_flat')
      .select('*')
      .order('registered_at', { ascending: false }),
    adminClient
      .from('admin_event_summary')
      .select('*')
      .order('event_date', { ascending: false }),
  ])

  const rows = (flatRows ?? []) as FlatRow[]

  // Build runner summaries (unique users with aggregate stats)
  const runnerMap = new Map<string, RunnerRow>()
  for (const row of rows) {
    if (!runnerMap.has(row.user_id)) {
      runnerMap.set(row.user_id, {
        user_id: row.user_id,
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

  // Build attendees per event
  const attendeesMap = new Map<string, EventWithAttendees['attendees']>()
  for (const row of rows) {
    if (!attendeesMap.has(row.event_id)) attendeesMap.set(row.event_id, [])
    attendeesMap.get(row.event_id)!.push({
      registration_id: row.registration_id,
      user_id: row.user_id,
      full_name: row.full_name,
      runner_tag: row.runner_tag,
      email: row.email,
      status: row.status,
      registered_at: row.registered_at,
      checked_in_at: row.checked_in_at,
    })
  }

  const events: EventWithAttendees[] = ((eventSummaries ?? []) as EventSummary[]).map(e => ({
    ...e,
    attendees: attendeesMap.get(e.id) ?? [],
  }))

  const totalUniqueRunners = runnerMap.size
  const totalCheckIns = runners.reduce((s, r) => s + r.checked_in_count, 0)
  const totalConfirmed = runners.reduce((s, r) => s + r.confirmed_count, 0)

  return (
    <div>
      <h1 className='text-3xl font-bold text-white mb-2'>Registrations</h1>
      <p className='text-white/40 text-sm mb-8'>Master list of all runners and per-event breakdown.</p>

      {/* Summary cards */}
      <div className='grid grid-cols-3 gap-4 mb-8'>
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5'>
          <p className='text-white/50 text-xs uppercase tracking-widest'>Events</p>
          <p className='text-3xl font-bold text-stride-yellow-accent mt-1'>{events.length}</p>
        </div>
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5'>
          <p className='text-white/50 text-xs uppercase tracking-widest'>Unique Runners</p>
          <p className='text-3xl font-bold text-stride-yellow-accent mt-1'>{totalUniqueRunners}</p>
        </div>
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5'>
          <p className='text-white/50 text-xs uppercase tracking-widest'>Check-ins</p>
          <p className='text-3xl font-bold text-stride-yellow-accent mt-1'>{totalCheckIns}</p>
        </div>
      </div>

      <RegistrationsClient
        runners={runners}
        events={events}
        totalConfirmed={totalConfirmed}
      />
    </div>
  )
}
