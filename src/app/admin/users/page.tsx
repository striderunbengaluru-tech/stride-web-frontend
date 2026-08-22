import { adminClient } from '@/lib/supabase/admin'
import { UsersClient, type UserRow } from '@/components/admin/users-client'
import { requireFullAdmin } from '@/lib/auth/admin-access'
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows'

export const metadata = { title: 'Users — Admin' }

// Shapes of the two selects below. Declared here rather than inferred so the
// paged reads stay type-checked against the column lists.
type UserRecord = Omit<UserRow, 'confirmed_count' | 'last_active_at' | 'runs'>

type RegistrationRecord = {
  user_id: string
  status: string
  checked_in_at: string | null
  created_at: string | null
  events: { name: string; event_date: string | null } | null
}

export default async function AdminUsersPage(){
  // ADMIN only. A LEAD reaching this route is redirected to check-in.
  await requireFullAdmin()

  // Both tables are read in full: the role counts and per-user aggregates below
  // are only correct over every row, and an unpaged select stops at 1000.
  const [users, registrations] = await Promise.all([
    fetchAllRows<UserRecord>('users', (from, to) =>
      adminClient
        .from('users')
        .select('id, full_name, email, username, role, created_at, avatar_url, runner_tag, runs_completed, gender, date_of_birth, contact_number, emergency_contact_number, location, bio')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to)
    ),
    // All registrations the user has — for confirmed count + run history
    fetchAllRows<RegistrationRecord>('registrations', async (from, to) => {
      const { data, error } = await adminClient
        .from('event_registrations')
        .select('user_id, status, checked_in_at, created_at, events(name, event_date)')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to)
      // supabase-js types every embed as an array. `events` is a to-one relation,
      // so at runtime it is a single object (or null) — narrowed here.
      return { data: data as unknown as RegistrationRecord[] | null, error }
    }),
  ])

  // Group history + counts by user_id
  type RunEntry = { eventName: string; eventDate: string | null; checkedInAt: string }
  const runsByUser = new Map<string, RunEntry[]>()
  const confirmedByUser = new Map<string, number>()
  const mostRecentByUser = new Map<string, string | null>()

  for (const reg of registrations) {
    // Confirmed count
    if (reg.status === 'CONFIRMED') {
      confirmedByUser.set(reg.user_id, (confirmedByUser.get(reg.user_id) ?? 0) + 1)
    }
    // Most-recent registration timestamp (any status) for "last seen"
    const prev = mostRecentByUser.get(reg.user_id)
    if (!prev || (reg.created_at && reg.created_at > prev)) {
      mostRecentByUser.set(reg.user_id, reg.created_at ?? null)
    }
    // Run history: check-ins only
    if (reg.checked_in_at) {
      const eventData = reg.events
      if (eventData) {
        const entry: RunEntry = {
          eventName: eventData.name,
          eventDate: eventData.event_date,
          checkedInAt: reg.checked_in_at,
        }
        const existing = runsByUser.get(reg.user_id) ?? []
        existing.push(entry)
        runsByUser.set(reg.user_id, existing)
      }
    }
  }

  const userRows: UserRow[] = users.map(u => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    username: u.username,
    role: u.role,
    created_at: u.created_at,
    avatar_url: u.avatar_url,
    runner_tag: u.runner_tag,
    runs_completed: u.runs_completed,
    gender: u.gender,
    date_of_birth: u.date_of_birth,
    contact_number: u.contact_number,
    emergency_contact_number: u.emergency_contact_number,
    location: u.location,
    bio: u.bio,
    confirmed_count: confirmedByUser.get(u.id) ?? 0,
    last_active_at: mostRecentByUser.get(u.id) ?? u.created_at,
    runs: runsByUser.get(u.id) ?? [],
  }))

  return (
    <div>
      <div className='flex items-center justify-between mb-8'>
        <h1 className='text-3xl font-bold text-white'>Users</h1>
        <p className='text-white/40 text-sm'>{userRows.length} total</p>
      </div>
      <UsersClient users={userRows} />
    </div>
  )
}
