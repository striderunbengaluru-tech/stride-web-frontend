import Link from 'next/link'
import { ROLES, LEAD_HOME } from '@/types/auth'
import type { UserProfile } from '@/types/user'

/**
 * The role a member carries, shown on their profile.
 *
 * Staff roles (ADMIN, LEAD) get the accent treatment and link to wherever that
 * role actually starts — the dashboard for an admin, check-in for a lead, whose
 * portal is that one screen. A lead reads "LEAD" here, never "ADMIN": the badge
 * names the access they have, and calling it admin would misdescribe it both to
 * them and to anyone reading their profile.
 */
export function RoleBadge({ role }: { role: UserProfile['role'] }) {
  if (role === ROLES.GUEST) return null

  const isStaff = role === ROLES.ADMIN || role === ROLES.LEAD

  const styles = isStaff
    ? 'bg-stride-yellow-accent/20 text-stride-yellow-accent border-stride-yellow-accent/40'
    : 'bg-white/10 text-white/70 border-white/20'

  const baseClass = `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles}`

  if (isStaff) {
    return (
      <Link
        href={role === ROLES.ADMIN ? '/admin' : LEAD_HOME}
        className={`${baseClass} cursor-pointer hover:brightness-125 transition-all`}
      >
        {role}
      </Link>
    )
  }

  return <span className={baseClass}>{role}</span>
}
