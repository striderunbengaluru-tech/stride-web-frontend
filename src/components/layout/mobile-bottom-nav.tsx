'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Home, Users, Handshake, Sparkles, X } from 'lucide-react'
import clsx from 'clsx'

const ORIGINALS_ITEMS = [
  { label: 'Lake Hop Project', href: '/originals/lake-hop-project' },
  { label: 'Stride Like a Woman', href: '/originals/stride-like-a-woman' },
  { label: 'Stride Creator Program', href: '/originals/stride-creator-program' },
  { label: 'Bakery Hop Run', href: '/originals/bakery-hop-run' },
] as const

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [originalsOpen, setOriginalsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const isOriginalsActive = pathname.startsWith('/originals')

  useEffect(() => {
    setOriginalsOpen(false)
  }, [pathname])

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Team', href: '/team', icon: Users },
    { label: 'Partnerships', href: '/partnerships', icon: Handshake },
  ]

  return (
    <>
      {/* Originals panel — slides up from above bottom nav */}
      {originalsOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40 bg-black/40 md:hidden'
            onClick={() => setOriginalsOpen(false)}
            aria-hidden='true'
          />
          {/* Panel */}
          <div
            ref={panelRef}
            className='fixed bottom-20 left-4 right-4 z-50 md:hidden rounded-2xl bg-stride-purple-primary/95 backdrop-blur-2xl border border-white/15 overflow-hidden shadow-2xl'
          >
            <div className='flex items-center justify-between px-5 py-4 border-b border-white/10'>
              <div className='flex items-center gap-2 text-stride-yellow-accent'>
                <Sparkles className='size-4' />
                <span className='text-sm font-semibold'>Stride Originals</span>
              </div>
              <button
                onClick={() => setOriginalsOpen(false)}
                aria-label='Close'
                className='text-copy-white/50 hover:text-copy-white transition-colors'
              >
                <X className='size-5' />
              </button>
            </div>
            {ORIGINALS_ITEMS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center px-5 py-4 text-sm font-medium border-b border-white/5 last:border-0 transition-colors duration-150',
                  pathname === href
                    ? 'text-stride-yellow-accent bg-white/10'
                    : 'text-copy-white/80 hover:text-copy-white hover:bg-white/10'
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Bottom nav bar */}
      <nav
        aria-label='Mobile navigation'
        className='fixed bottom-0 left-0 right-0 z-50 md:hidden bg-stride-purple-primary/50 backdrop-blur-2xl border-t border-white/15 rounded-t-3xl'
      >
        <div className='flex items-center justify-around px-2 py-2 pb-safe'>
          {navItems.map(({ label, href, icon: Icon }) => {
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

          {/* Originals button */}
          <button
            onClick={() => setOriginalsOpen((o) => !o)}
            aria-expanded={originalsOpen}
            aria-label='Stride Originals'
            className={clsx(
              'flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-11 min-h-11 justify-center transition-colors duration-150',
              isOriginalsActive || originalsOpen
                ? 'text-stride-yellow-accent'
                : 'text-copy-white/50 hover:text-copy-white'
            )}
          >
            <Sparkles className='size-5' />
            <span className='text-[10px] font-medium'>Originals</span>
          </button>
        </div>
      </nav>
    </>
  )
}
