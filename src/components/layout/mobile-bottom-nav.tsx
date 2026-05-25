'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Handshake } from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Partnerships', href: '/partnerships', icon: Handshake },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <div className='fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 md:hidden'>
      <nav
        aria-label='Mobile navigation'
        className='flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-2xl border border-white/12 p-1.5 shadow-2xl shadow-black/30'
      >
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
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
      </nav>
    </div>
  )
}
