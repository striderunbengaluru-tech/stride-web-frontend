import { adminClient } from '@/lib/supabase/admin'
import { ROLES, type Role } from '@/types/auth'

/**
 * Who may manage which event. The one rule, shared by the Events pages, the
 * event server actions and the image routes so they can never disagree:
 *
 *   ADMIN — every event.
 *   LEAD  — only events a LEAD created (`events.owner_role = 'LEAD'`), whoever
 *           the lead was. Admin-created events are invisible to them, so a lead
 *           can't edit, delete or read the participants of an admin's event.
 *   anyone else — nothing.
 *
 * `owner_role` is stamped at creation and never changes, so promoting or
 * removing a lead doesn't move events in or out of leads' reach.
 */
export function canManageEvent(role: Role | null | undefined, ownerRole: string | null | undefined): boolean {
  if (role === ROLES.ADMIN) return true
  if (role === ROLES.LEAD) return ownerRole === ROLES.LEAD
  return false
}

/** True when an event with this id exists and `role` may manage it. Fails closed. */
export async function canManageEventId(role: Role | null | undefined, eventId: string): Promise<boolean> {
  if (typeof eventId !== 'string' || !eventId) return false
  const { data } = await adminClient
    .from('events')
    .select('owner_role')
    .eq('id', eventId)
    .maybeSingle()
  return data ? canManageEvent(role, data.owner_role as string | null) : false
}

/** The owner_role a LEAD's queries are narrowed to, or null for an ADMIN (no filter). */
export function ownerRoleFilter(role: Role): string | null {
  return role === ROLES.ADMIN ? null : ROLES.LEAD
}
