'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useAuth } from '@/components/auth/auth-provider'

const NAV_LINKS = [
  { label: 'Events',       href: '/events' },
  { label: 'Partnerships', href: '/partnerships' },
  { label: 'Leaderboard',  href: '/leaderboard' },
] as const

export default function NavLinks() {
  const pathname = usePathname()
  const { status } = useAuth()

  // Signed-out visitors only. Once someone is signed in these same links live in
  // the avatar menu, so repeating them in the bar is noise. Nothing renders while
  // the session resolves, matching NavbarAuth — that avoids a flash of links for
  // members on first paint.
  if (status !== 'signed-out') return null

  return (
    <ul className='hidden md:flex items-center gap-7 list-none m-0 p-0'>
      {NAV_LINKS.map(({ label, href }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <li key={href} className='relative flex flex-col items-center'>
            <Link
              href={href}
              className={clsx(
                'text-sm lg:text-lg font-medium transition-colors duration-150',
                isActive ? 'text-copy-white' : 'text-copy-white/70 hover:text-copy-white'
              )}
            >
              {label}
            </Link>
            {isActive && (
              <span className='absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-stride-yellow-accent glow-yellow' />
            )}
          </li>
        )
      })}
    </ul>
  )
}
