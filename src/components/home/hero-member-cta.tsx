'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-provider'

const ctaClass =
  'inline-flex items-center justify-center rounded-md bg-stride-yellow-accent px-8 py-3 min-h-11 text-copy-black font-bold text-base md:text-lg hover:scale-[1.03] active:scale-[0.97] transition-transform duration-150'

/**
 * The hero's one CTA. With a run coming up it points everyone at the events
 * hub — members want the next run too. Between runs it falls back to the
 * membership pitch, which only signed-out visitors see: signed-in visitors are
 * already members, and the middleware bounces them off /become-a-member back to
 * `/`. A client island so the homepage can stay static.
 */
export function HeroMemberCta({ hasUpcoming }: { hasUpcoming: boolean }) {
  const { status } = useAuth()
  if (!hasUpcoming && status !== 'signed-out') return null

  return (
    <div
      className='relative z-10 mt-10'
      style={{ animation: 'hero-title-enter 1s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both' }}
    >
      {hasUpcoming ? (
        <Link href='/events' className={ctaClass}>
          Join our next event
        </Link>
      ) : (
        <Link href='/become-a-member' className={ctaClass}>
          Become a Strider
        </Link>
      )}
    </div>
  )
}
