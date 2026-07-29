'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, Handshake, Trophy } from 'lucide-react'
import clsx from 'clsx'
import { useRevealAfterFold } from '@/hooks/use-reveal-after-fold'

const STATIC_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Events', href: '/events', icon: CalendarDays },
  { label: 'Partnerships', href: '/partnerships', icon: Handshake },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
]

export function MobileBottomNavClient() {
  const pathname = usePathname()
  // Docked nav stays hidden until the visitor scrolls past the first fold so
  // the opening screen isn't crowded with floating chrome.
  const revealed = useRevealAfterFold()

  // Hide on event detail pages — the sticky register bar is the primary mobile CTA there
  if (/^\/events\/.+/.test(pathname)) return null
  if (!revealed) return null

  return (
    <div className='animate-fade-in-up fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 md:hidden'>
      <nav
        aria-label='Mobile navigation'
        // Mobile-only surface floating over scrolling content: `backdrop-blur-2xl`
        // meant the browser re-filtered the scene behind it every frame. A
        // smaller radius plus a more opaque backing looks the same at this size
        // and costs a fraction as much.
        // `max-w-full` + `overflow-x-auto`: four stacked items just fit at 375px,
        // but below that they'd push the pill past the viewport. Scrolling inside
        // the pill keeps the page itself free of horizontal scroll.
        className='flex items-center gap-1 max-w-full overflow-x-auto rounded-full bg-black/70 backdrop-blur-md border border-white/12 p-1.5 shadow-2xl shadow-black/30'
      >
        {STATIC_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                // Icon stacked over the label. min-h-11/min-w-11 keep the touch
                // target at 44px even though the visual box is smaller.
                'flex flex-col items-center justify-center gap-1 rounded-full px-3 py-2 transition-all duration-200 min-h-11 min-w-11 shrink-0',
                isActive
                  ? 'bg-stride-yellow-accent text-copy-black'
                  : 'text-white/55 hover:text-white hover:bg-white/8'
              )}
            >
              <Icon className='size-4.5 shrink-0' />
              <span className='text-[10px] font-semibold leading-none whitespace-nowrap'>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
