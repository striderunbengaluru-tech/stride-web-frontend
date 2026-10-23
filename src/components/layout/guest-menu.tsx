'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, UserRound } from 'lucide-react'
import { useDismiss } from '@/hooks/use-dismiss'
import { SITE_LINKS } from './site-links'

/** Placeholder avatar for a visitor with no account. */
function GuestAvatar({ large = false }: { large?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-copy-white/15 bg-copy-white/10 text-copy-white/70 ${large ? 'h-10 w-10' : 'h-8 w-8'}`}
      aria-hidden='true'
    >
      <UserRound size={large ? 18 : 16} />
    </span>
  )
}

/**
 * The signed-out twin of UserMenu: same trigger footprint and dropdown shell,
 * with a membership pitch where a member's name and email would sit.
 */
export function GuestMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, close)

  return (
    <div ref={ref} className='relative'>
      <button
        type='button'
        onClick={() => setOpen((prev) => !prev)}
        className='flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-1.5 transition-colors hover:bg-copy-white/8 cursor-pointer'
        aria-expanded={open}
        aria-haspopup='menu'
        aria-label='Open menu'
      >
        <GuestAvatar />
        <ChevronDown
          size={14}
          className={`hidden sm:block text-copy-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden='true'
        />
      </button>

      {open && (
        <div
          role='menu'
          className='absolute right-0 top-full mt-2 w-64 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 z-50 origin-top-right animate-fade-in-up'
          style={{ animationDuration: '180ms' }}
        >
          <div className='bg-stride-purple-primary border border-copy-white/12 rounded-2xl'>

            {/* Header — membership pitch in place of a member's name and email */}
            <div className='px-4 pt-4 pb-4 border-b border-copy-white/8 space-y-3'>
              <div className='flex items-center gap-3'>
                <GuestAvatar large />
                <p className='text-copy-white/75 text-sm leading-snug line-clamp-3'>
                  Join the next experience by becoming a Stride Run Club member.
                </p>
              </div>
              <Link
                href='/become-a-member'
                role='menuitem'
                onClick={close}
                className='flex min-h-11 w-full items-center justify-center rounded-md bg-stride-yellow-accent text-copy-black text-sm font-bold transition-colors hover:bg-stride-yellow-accent/90'
              >
                Become a Strider
              </Link>
            </div>

            {/* Site nav */}
            <div className='py-1.5'>
              {SITE_LINKS.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role='menuitem'
                  onClick={close}
                  className='flex items-center gap-3 mx-1.5 px-3 py-2.5 rounded-lg text-copy-white/70 hover:text-copy-white hover:bg-copy-white/8 transition-colors text-sm'
                >
                  <Icon size={15} className='shrink-0 text-copy-white/50' aria-hidden='true' />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
