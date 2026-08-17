import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { ROLES, isPortalRole, LEAD_HOME, type Role } from '@/types/auth'

/**
 * The two gates every admin surface goes through.
 *
 * There are exactly two levels of access to the portal and it matters that
 * they stay explicit rather than being re-derived page by page:
 *
 *   requirePortalAccess()  ADMIN or LEAD — may load the portal shell
 *   requireFullAdmin()     ADMIN only    — everything except check-in
 *
 * A LEAD is run staff: they check athletes in at an event and nothing else.
 * They are not a junior admin, so a page that forgets to call the right guard
 * must fail closed. That is why `requireFullAdmin` is a positive assertion each
 * page makes for itself rather than something the layout infers — the layout
 * cannot see which route rendered beneath it, and a shared parent gate that
 * silently admits two different roles is exactly how a portal grows a hole.
 *
 * Role is always read fresh from the database. JWT claims can be stale after a
 * grant or revoke, and a revoked LEAD must lose access on their next request,
 * not whenever their token happens to refresh.
 */

export type PortalViewer = {
  userId: string
  role: Role
  /** Display name for audit trails, matching requireAdmin()'s actorName. */
  actorName: string
}

async function readViewer(): Promise<PortalViewer | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: row } = await adminClient
    .from('users')
    .select('role, full_name, username')
    .eq('id', user.id)
    .single()

  const role = row?.role as Role | undefined
  if (!role) return null

  const actorName: string =
    (row?.full_name as string | null)?.trim() ||
    (row?.username as string | null) ||
    user.email ||
    'Staff'

  return { userId: user.id, role, actorName }
}

/**
 * Admin portal shell. Admits ADMIN and LEAD; everyone else leaves the site's
 * admin area entirely.
 */
export async function requirePortalAccess(): Promise<PortalViewer> {
  const viewer = await readViewer()
  if (!viewer || !isPortalRole(viewer.role)) redirect('/')
  return viewer
}

/**
 * Full admin. A LEAD is redirected to the one screen they may use rather than
 * off the site — they are staff who took a wrong turn, not an intruder.
 */
export async function requireFullAdmin(): Promise<PortalViewer> {
  const viewer = await readViewer()
  if (!viewer) redirect('/')
  if (viewer.role === ROLES.LEAD) redirect(LEAD_HOME)
  if (viewer.role !== ROLES.ADMIN) redirect('/')
  return viewer
}

/**
 * Check-in, the one surface a LEAD shares with an ADMIN.
 *
 * Returns null instead of redirecting so callers embedded in a page render
 * (the wallet-pass scan handler) can decline the mutation without hijacking
 * the response.
 */
export async function getCheckInActor(): Promise<PortalViewer | null> {
  const viewer = await readViewer()
  if (!viewer || !isPortalRole(viewer.role)) return null
  return viewer
}
