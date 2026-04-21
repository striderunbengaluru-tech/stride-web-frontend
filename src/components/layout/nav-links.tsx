'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import clsx from 'clsx'

const NAV_LINKS = [
  { label: 'Team', href: '/team' },
  { label: 'Partnerships', href: '/partnerships' },
] as const

const ORIGINALS_ITEMS = [
  { label: 'Lake Hop Project', href: '/originals/lake-hop-project' },
  { label: 'Stride Like a Woman', href: '/originals/stride-like-a-woman' },
  { label: 'Stride Creator Program', href: '/originals/stride-creator-program' },
  { label: 'Bakery Hop Run', href: '/originals/bakery-hop-run' },
] as const

export default function NavLinks() {
  const pathname = usePathname()
  const [originalsOpen, setOriginalsOpen] = useState(false)
  const dropdownRef = useRef<HTMLLIElement>(null)

  const isOriginalsActive = pathname.startsWith('/originals')

  useEffect(() => {
    setOriginalsOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOriginalsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
              <span className='absolute -bottom-3.5 w-1.5 h-1.5 rounded-full bg-stride-yellow-accent glow-yellow' />
            )}
          </li>
        )
      })}

      {/* Stride Originals dropdown */}
      <li ref={dropdownRef} className='relative flex flex-col items-center'>
        <button
          onClick={() => setOriginalsOpen((o) => !o)}
          className={clsx(
            'flex items-center gap-1.5 text-sm lg:text-lg font-medium transition-colors duration-150 cursor-pointer',
            isOriginalsActive || originalsOpen ? 'text-copy-white' : 'text-copy-white/70 hover:text-copy-white'
          )}
          aria-expanded={originalsOpen}
          aria-haspopup='true'
        >
          <Sparkles className='size-4' />
          Stride Originals
          <ChevronDown
            className={clsx('size-4 transition-transform duration-200', originalsOpen && 'rotate-180')}
          />
        </button>
        {isOriginalsActive && !originalsOpen && (
          <span className='absolute -bottom-3.5 w-1.5 h-1.5 rounded-full bg-stride-yellow-accent glow-yellow' />
        )}

        {originalsOpen && (
          <div className='absolute top-full mt-3 left-1/2 -translate-x-1/2 w-56 bg-stride-purple-primary/90 backdrop-blur-xl border border-white/15 rounded-xl overflow-hidden shadow-2xl z-50'>
            {ORIGINALS_ITEMS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'block px-4 py-3 text-sm font-medium transition-colors duration-150',
                  pathname === href
                    ? 'text-stride-yellow-accent bg-white/10'
                    : 'text-copy-white/80 hover:text-copy-white hover:bg-white/10'
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </li>
    </ul>
  )
}
