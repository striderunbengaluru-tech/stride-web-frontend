'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, User } from 'lucide-react'
import { authClient } from '@/lib/auth/client'

type Props = {
  username: string
  firstName: string
  avatarUrl: string | null
}

export default function UserMenu({ username, firstName, avatarUrl }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/login')
          router.refresh()
        },
      },
    })
  }

  return (
    <div ref={ref} className='relative'>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className='flex items-center gap-2 min-h-11 px-2 rounded-md cursor-pointer hover:bg-copy-white/10 transition-colors'
        aria-expanded={open}
        aria-haspopup='menu'
        aria-label={`${firstName}'s account menu`}
      >
        {/* Avatar — always visible on all screen sizes */}
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={firstName}
            width={32}
            height={32}
            className='w-8 h-8 rounded-full object-cover shrink-0'
          />
        ) : (
          <div className='w-8 h-8 rounded-full bg-stride-yellow-accent/20 border border-stride-yellow-accent/40 flex items-center justify-center shrink-0'>
            <span className='text-stride-yellow-accent text-sm font-bold'>
              {firstName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* "Hi, firstName" — visible sm+ only */}
        <span className='hidden sm:block text-copy-white/80 text-sm font-libre'>
          Hi, {firstName}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role='menu'
          className='absolute right-0 top-full mt-2 w-48 bg-stride-purple-primary/95 backdrop-blur-xl border border-copy-white/15 rounded-xl overflow-hidden shadow-xl z-50'
        >
          <Link
            href={`/profile/${username}`}
            role='menuitem'
            onClick={() => setOpen(false)}
            className='flex items-center gap-3 px-4 py-3 text-copy-white/70 hover:text-copy-white hover:bg-copy-white/10 transition-colors text-sm'
          >
            <User size={15} aria-hidden='true' />
            View Profile
          </Link>

          <div className='border-t border-copy-white/10'>
            <button
              type='button'
              role='menuitem'
              onClick={handleSignOut}
              className='w-full flex items-center gap-3 px-4 py-3 text-copy-white/70 hover:text-copy-white hover:bg-copy-white/10 transition-colors text-sm'
            >
              <LogOut size={15} aria-hidden='true' />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
