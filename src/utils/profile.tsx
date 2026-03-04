import Link from 'next/link'
import { ROLES } from '@/types/auth'
import type { UserProfile } from '@/types/user'

export function RoleBadge({ role }: { role: UserProfile['role'] }) {
  if (role === ROLES.GUEST) return null

  const styles =
    role === ROLES.ADMIN
      ? 'bg-stride-yellow-accent/20 text-stride-yellow-accent border-stride-yellow-accent/40'
      : 'bg-white/10 text-white/70 border-white/20'

  const baseClass = `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles}`

  if (role === ROLES.ADMIN) {
    return (
      <Link href='/admin' className={`${baseClass} cursor-pointer hover:brightness-125 transition-all`}>
        {role}
      </Link>
    )
  }

  return <span className={baseClass}>{role}</span>
}
