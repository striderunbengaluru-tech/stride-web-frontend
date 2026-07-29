'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-provider'

// Client island so the homepage can stay static. Signed-in visitors are
// already members — and the middleware bounces them off /become-a-member back
// to `/` — so the CTA renders only once the local session resolves signed-out.
export function HeroMemberCta() {
  const { status } = useAuth()
  if (status !== 'signed-out') return null

  return (
    <div
      className='relative z-10 mt-10'
      style={{ animation: 'hero-title-enter 1s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both' }}
    >
      <Link
        href='/become-a-member'
        className='cta-glow relative inline-flex items-center justify-center rounded-md bg-stride-yellow-accent px-8 py-3 min-h-11 text-copy-black font-bold text-base md:text-lg hover:scale-[1.03] active:scale-[0.97] transition-transform duration-150'
      >
        Become a Member
      </Link>
    </div>
  )
}
