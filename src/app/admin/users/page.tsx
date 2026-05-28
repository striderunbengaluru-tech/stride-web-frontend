import { adminClient } from '@/lib/supabase/admin'
import { UsersClient, type UserRow } from '@/components/admin/users-client'

export const metadata = { title: 'Users — Admin' }

export default async function AdminUsersPage() {
  const [{ data: users }, { data: runHistory }] = await Promise.all([
    adminClient
      .from('users')
      .select('id, full_name, email, username, role, created_at, avatar_url, runner_tag, runs_completed')
      .order('created_at', { ascending: false }),
    adminClient
      .from('event_registrations')
      .select('user_id, checked_in_at, events(name, event_date)')
      .not('checked_in_at', 'is', null)
      .order('checked_in_at', { ascending: false }),
  ])

  // Group run history by user_id
  type RunEntry = { eventName: string; eventDate: string | null; checkedInAt: string }
  const runsByUser = new Map<string, RunEntry[]>()

  for (const reg of runHistory ?? []) {
    const eventData = reg.events as unknown as { name: string; event_date: string | null } | null
    if (!eventData || !reg.checked_in_at) continue
    const entry: RunEntry = {
      eventName: eventData.name,
      eventDate: eventData.event_date,
      checkedInAt: reg.checked_in_at,
    }
    const existing = runsByUser.get(reg.user_id) ?? []
    existing.push(entry)
    runsByUser.set(reg.user_id, existing)
  }

  const userRows: UserRow[] = (users ?? []).map(u => ({
    ...u,
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
