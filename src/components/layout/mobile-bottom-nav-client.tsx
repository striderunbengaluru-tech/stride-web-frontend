'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, LogIn } from 'lucide-react'
import clsx from 'clsx'

type NavUser = {
  username: string
  firstName: string
  avatarUrl: string | null
}

const STATIC_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Events', href: '/events', icon: CalendarDays },
]

export function MobileBottomNavClient({ navUser }: { navUser: NavUser | null }) {
  const pathname = usePathname()

  return (
    <div className='fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 md:hidden'>
      <nav
        aria-label='Mobile navigation'
        className='flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-2xl border border-white/12 p-1.5 shadow-2xl shadow-black/30'
      >
        {STATIC_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2 rounded-full px-4 py-2.5 transition-all duration-200 min-h-11',
                isActive
                  ? 'bg-stride-yellow-accent text-copy-black'
                  : 'text-white/55 hover:text-white hover:bg-white/8'
              )}
            >
              <Icon className='size-[18px] shrink-0' />
              <span className='text-xs font-semibold whitespace-nowrap'>{label}</span>
            </Link>
          )
        })}

        {/* Profile / Login */}
        {navUser ? (
          <Link
            href={`/profile/${navUser.username}`}
            className={clsx(
              'flex items-center gap-2 rounded-full px-3 py-2.5 transition-all duration-200 min-h-11',
              pathname.startsWith('/profile')
                ? 'bg-stride-yellow-accent text-copy-black'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            )}
            aria-label={`${navUser.firstName}'s profile`}
          >
            {navUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={navUser.avatarUrl}
                alt={navUser.firstName}
                className='size-[22px] rounded-full object-cover shrink-0'
                referrerPolicy='no-referrer'
              />
            ) : (
              <div className='size-[22px] rounded-full bg-stride-yellow-accent/30 flex items-center justify-center shrink-0'>
                <span className='text-[10px] font-bold text-stride-yellow-accent'>
                  {navUser.firstName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className='text-xs font-semibold whitespace-nowrap'>
              {navUser.firstName}
            </span>
          </Link>
        ) : (
          <Link
            href='/login'
            className={clsx(
              'flex items-center gap-2 rounded-full px-4 py-2.5 transition-all duration-200 min-h-11',
              pathname === '/login'
                ? 'bg-stride-yellow-accent text-copy-black'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            )}
          >
            <LogIn className='size-[18px] shrink-0' />
            <span className='text-xs font-semibold whitespace-nowrap'>Sign In</span>
          </Link>
        )}
      </nav>
    </div>
  )
}
