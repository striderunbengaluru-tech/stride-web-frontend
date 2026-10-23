import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { ROLES, type Role } from '@/types/auth'

/**
 * Gate every admin write. Returns the acting admin plus a display-name snapshot
 * for the attribution columns (`events.created_by/updated_by`,
 * `races.created_by/updated_by`, `event_registrations.decided_by`) — a name
 * rather than an id, so the trail survives hardDeleteUser() erasing the users row.
 *
 * Lives outside the `'use server'` modules so several action files can share it:
 * a server-actions file may only export async functions, and importing one
 * action file from another would make every helper a public endpoint.
 */
export async function requireAdmin() {
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

/**
 * Gate every event write (create, update, delete, approve/reject, coupons).
 * Admits ADMIN and LEAD; every caller except create must then confirm the
 * specific event with canManageEventId(role, eventId), because a LEAD may only
 * touch lead-created events. Role is read fresh from the DB, as above.
 */
export async function requireEventManager(): Promise<{ actorName: string; role: Role }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: row } = await adminClient
    .from('users')
    .select('role, full_name, username')
    .eq('id', user.id)
    .single()

  const role = row?.role as Role | undefined
  if (role !== ROLES.ADMIN && role !== ROLES.LEAD) redirect('/')

  const actorName: string =
    (row?.full_name as string | null)?.trim() ||
    (row?.username as string | null) ||
    user.email ||
    'Staff'

  return { actorName, role }
}
