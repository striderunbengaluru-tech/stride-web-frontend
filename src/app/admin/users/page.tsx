import { adminClient } from '@/lib/supabase/admin'
import { UsersClient, type UserRow } from '@/components/admin/users-client'

export const metadata = { title: 'Users — Admin' }

export default async function AdminUsersPage() {
  const [{ data: users }, { data: registrations }] = await Promise.all([
    adminClient
      .from('users')
      .select(
        'id, full_name, email, username, role, created_at, avatar_url, runner_tag, runs_completed, ' +
        'gender, date_of_birth, contact_number, emergency_contact_number, location, bio'
      )
      .order('created_at', { ascending: false }),
    // All registrations the user has — for confirmed count + run history
    adminClient
      .from('event_registrations')
      .select('user_id, status, checked_in_at, created_at, events(name, event_date)')
      .order('created_at', { ascending: false }),
  ])

  // Group history + counts by user_id
  type RunEntry = { eventName: string; eventDate: string | null; checkedInAt: string }
  const runsByUser = new Map<string, RunEntry[]>()
  const confirmedByUser = new Map<string, number>()
  let mostRecentByUser = new Map<string, string | null>()
  mostRecentByUser = new Map<string, string | null>()

  for (const reg of registrations ?? []) {
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
      const eventData = reg.events as unknown as { name: string; event_date: string | null } | null
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

  const userRows: UserRow[] = (users ?? []).map(u => ({
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
