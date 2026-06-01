'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  ShoppingBag,
  Users,
  ScanLine,
} from 'lucide-react'

const navLinks = [
  { href: '/admin',               label: 'Dashboard',      icon: LayoutDashboard, exact: true },
  { href: '/admin/events',        label: 'Events',         icon: CalendarDays },
  { href: '/admin/registrations', label: 'Registrations',  icon: ClipboardList },
  { href: '/admin/products',      label: 'Products',       icon: ShoppingBag },
  { href: '/admin/users',         label: 'Users',          icon: Users },
  { href: '/admin/check-in',      label: 'Check-in',       icon: ScanLine },
]

export function AdminNav() {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const checkInActive = isActive('/admin/check-in')

  return (
    <>
      {/* ── Admin nav — shown on every screen size, scrolls horizontally on mobile ── */}
      <nav className='sticky top-28 z-40 bg-stride-purple-primary/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20'>
        <div className='max-w-6xl mx-auto px-4 sm:px-6'>
          <div className='flex items-center gap-1 h-12 overflow-x-auto scrollbar-hide'>

            {/* Admin badge */}
            <span className='text-xs font-bold text-stride-yellow-accent bg-stride-yellow-accent/10 border border-stride-yellow-accent/25 px-2.5 py-1 rounded-md tracking-widest uppercase shrink-0 mr-2'>
              Admin
            </span>

            {/* Separator */}
            <div className='h-5 w-px bg-white/10 shrink-0 mr-1' aria-hidden='true' />

            {/* Nav links */}
            {navLinks.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-stride-yellow-accent text-copy-black shadow-sm'
                      : 'text-white/50 hover:text-white hover:bg-white/8'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    size={14}
                    strokeWidth={active ? 2.5 : 2}
                    className='shrink-0'
                  />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* ── Mobile floating CTA — only Check-in, bottom-left ── */}
      {!checkInActive && (
        <Link
          href='/admin/check-in'
          className='md:hidden fixed bottom-6 right-4 z-40 inline-flex items-center gap-2 bg-stride-yellow-accent text-copy-black font-bold text-sm px-4 py-3 rounded-full shadow-xl shadow-stride-yellow-accent/25 hover:scale-[1.03] active:scale-[0.97] transition-transform min-h-12'
          aria-label='Open check-in'
        >
          <ScanLine size={16} strokeWidth={2.5} />
          Check-in
        </Link>
      )}
    </>
  )
}
