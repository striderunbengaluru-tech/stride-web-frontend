export const ROLES = {
  GUEST: 'GUEST',
  MEMBER: 'MEMBER',
  /**
   * Run staff. Opens the admin portal, but only ever reaches the check-in
   * screen — every other admin surface treats a LEAD as an outsider. Granted
   * and revoked by an ADMIN only.
   *
   * Deliberately NOT a lesser admin: nothing that keys off ADMIN (the server
   * actions in lib/actions/admin.ts, the /api/admin/* routes, the RLS policies
   * on the admin tables, the last-admin protection) should ever match a LEAD.
   * See lib/auth/admin-access.ts for the two guards that draw that line.
   */
  LEAD: 'LEAD',
  ADMIN: 'ADMIN',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/**
 * Roles allowed to load the admin portal shell at all.
 *
 * Being in this list buys you the layout and nothing else — each page still
 * declares the access it needs. `users.role` carries a CHECK constraint in
 * Postgres, so adding a member here also means widening that constraint.
 */
export const PORTAL_ROLES: readonly Role[] = [ROLES.ADMIN, ROLES.LEAD]

export function isPortalRole(role: string | null | undefined): role is Role {
  return PORTAL_ROLES.includes(role as Role)
}

/**
 * Where a LEAD's portal begins and ends.
 *
 * Lives here rather than beside the guards in lib/auth/admin-access.ts because
 * client components need it too (the profile role badge links to it), and that
 * module reaches for next/headers via the Supabase server client — importing it
 * from the client would break the build.
 */
export const LEAD_HOME = '/admin/check-in'
