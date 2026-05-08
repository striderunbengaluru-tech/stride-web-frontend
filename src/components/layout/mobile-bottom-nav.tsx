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
    <nav
      aria-label='Mobile navigation'
      className='fixed bottom-0 left-0 right-0 z-50 md:hidden bg-stride-purple-primary/50 backdrop-blur-2xl border-t border-white/15 rounded-t-3xl'
    >
      <div className='flex items-center justify-around px-2 py-2 pb-safe'>
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-11 min-h-11 justify-center transition-colors duration-150',
                isActive
                  ? 'text-stride-yellow-accent'
                  : 'text-copy-white/50 hover:text-copy-white'
              )}
            >
              <Icon className='size-5' />
              <span className='text-[10px] font-medium'>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
