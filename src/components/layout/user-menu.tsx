'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, User, LayoutDashboard, ChevronDown, ShieldCheck, Footprints } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PREVIEW_FEATURES_ENABLED } from '@/lib/feature-flags'

type Props = {
  username: string
  firstName: string
  avatarUrl: string | null
  isAdmin: boolean
  email: string | null
}

export default function UserMenu({ username, firstName, avatarUrl, isAdmin, email }: Props) {
  const [open, setOpen] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onOutsideClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/become-a-member')
    router.refresh()
  }

  const initial = firstName.charAt(0).toUpperCase()

  return (
    <div ref={ref} className='relative'>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className='flex items-center gap-2 min-h-11 px-1.5 sm:pl-1.5 sm:pr-2.5 rounded-full hover:bg-copy-white/8 transition-colors cursor-pointer'
        aria-expanded={open}
        aria-haspopup='menu'
        aria-label={`${firstName}'s account menu`}
      >
        {avatarUrl && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={firstName}
            width={32}
            height={32}
            className='w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-copy-white/15'
            referrerPolicy='no-referrer'
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className='w-8 h-8 rounded-full bg-stride-yellow-accent/20 border border-stride-yellow-accent/40 flex items-center justify-center shrink-0'>
            <span className='text-stride-yellow-accent text-sm font-bold'>{initial}</span>
          </div>
        )}
        <span className='hidden sm:block text-copy-white/85 text-sm font-medium'>
          Hi, {firstName}
        </span>
        <ChevronDown
          size={14}
          className={`hidden sm:block text-copy-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role='menu'
          className='absolute right-0 top-full mt-2 w-64 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 z-50 origin-top-right animate-fade-in-up'
          style={{ animationDuration: '180ms' }}
        >
          {/* Glass shell */}
          <div className='bg-stride-purple-primary/85 backdrop-blur-2xl border border-copy-white/12 rounded-2xl'>

            {/* Header — avatar + name + email */}
            <div className='px-4 pt-4 pb-3 flex items-center gap-3 border-b border-copy-white/8'>
              {avatarUrl && !imgFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={firstName}
                  className='w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-copy-white/15'
                  referrerPolicy='no-referrer'
                />
              ) : (
                <div className='w-10 h-10 rounded-full bg-stride-yellow-accent/20 border border-stride-yellow-accent/40 flex items-center justify-center shrink-0'>
                  <span className='text-stride-yellow-accent font-bold'>{initial}</span>
                </div>
              )}
              <div className='min-w-0 flex-1'>
                <p className='text-copy-white text-sm font-semibold truncate'>{firstName}</p>
                <p className='text-copy-white/40 text-xs truncate'>{email ?? `@${username}`}</p>
              </div>
              {isAdmin && (
                <span
                  title='You are a verified admin'
                  aria-label='You are a verified admin'
                  className='shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-stride-yellow-accent/15 border border-stride-yellow-accent/30 text-stride-yellow-accent'
                >
                  <ShieldCheck size={13} />
                </span>
              )}
            </div>

            {/* Items */}
            <div className='py-1.5'>
              <Link
                href={`/profile/${username}`}
                role='menuitem'
                onClick={() => setOpen(false)}
                className='flex items-center gap-3 mx-1.5 px-3 py-2.5 rounded-lg text-copy-white/70 hover:text-copy-white hover:bg-copy-white/8 transition-colors text-sm'
              >
                <User size={15} className='shrink-0 text-copy-white/50' aria-hidden='true' />
                View profile
              </Link>

              {PREVIEW_FEATURES_ENABLED && (
                <Link
                  href='/my-runs'
                  role='menuitem'
                  onClick={() => setOpen(false)}
                  className='flex items-center gap-3 mx-1.5 px-3 py-2.5 rounded-lg text-copy-white/70 hover:text-copy-white hover:bg-copy-white/8 transition-colors text-sm'
                >
                  <Footprints size={15} className='shrink-0 text-copy-white/50' aria-hidden='true' />
                  My Runs
                </Link>
              )}

              {isAdmin && (
                <Link
                  href='/admin'
                  role='menuitem'
                  onClick={() => setOpen(false)}
                  className='flex items-center justify-between gap-3 mx-1.5 px-3 py-2.5 rounded-lg text-stride-yellow-accent hover:bg-stride-yellow-accent/10 transition-colors text-sm font-medium'
                >
                  <span className='flex items-center gap-3'>
                    <LayoutDashboard size={15} className='shrink-0' aria-hidden='true' />
                    Admin dashboard
                  </span>
                  <span className='text-[9px] font-bold font-mono uppercase tracking-widest bg-stride-yellow-accent/15 border border-stride-yellow-accent/30 rounded px-1.5 py-0.5'>
                    Admin
                  </span>
                </Link>
              )}
            </div>

            {/* Sign out */}
            <div className='border-t border-copy-white/8 py-1.5'>
              <button
                type='button'
                role='menuitem'
                onClick={handleSignOut}
                className='w-full flex items-center gap-3 mx-1.5 px-3 py-2.5 rounded-lg text-copy-white/65 hover:text-red-400 hover:bg-red-500/8 transition-colors text-sm'
                style={{ width: 'calc(100% - 0.75rem)' }}
              >
                <LogOut size={15} className='shrink-0' aria-hidden='true' />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
