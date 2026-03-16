'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const NAV_LINKS = [
  { label: 'Events', href: '/events' },
  { label: 'Shop', href: '/shop' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Team', href: '/team' },
  { label: 'Partnerships', href: '/partnerships' },
] as const

export default function NavLinks() {
  const pathname = usePathname()

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
                isActive
                  ? 'text-copy-white'
                  : 'text-copy-white/70 hover:text-copy-white'
              )}
            >
              {label}
            </Link>
            {isActive && (
              <span className='absolute -bottom-3.5 w-1.5 h-1.5 rounded-full bg-stride-yellow-accent glow-yellow' />
            )}
          </li>
        )
      })}
    </ul>
  )
}
