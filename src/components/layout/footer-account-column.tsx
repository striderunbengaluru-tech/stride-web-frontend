'use client'

import { useAuth } from '@/components/auth/auth-provider'
import { PREVIEW_FEATURES_ENABLED } from '@/lib/feature-flags'
import { NavLoadingLink } from './nav-loading-link'

// Client island so the footer (and the whole layout) can stay static.
// Signed-in visitors are already members — and the middleware bounces them
// off /become-a-member — so the column renders only for signed-out visitors.
// Markup mirrors the server-rendered Column in footer.tsx.
export function FooterAccountColumn() {
  const { status } = useAuth()
  if (status !== 'signed-out' || !PREVIEW_FEATURES_ENABLED) return null

  return (
    <nav aria-label='Account links' className='flex flex-col gap-3.5'>
      <p className='text-[10px] font-mono uppercase tracking-[0.25em] text-stride-yellow-accent'>
        Account
      </p>
      <ul className='flex flex-col gap-3'>
        <li>
          <NavLoadingLink
            href='/become-a-member'
            className='text-white/70 text-sm hover:text-stride-yellow-accent transition-colors duration-150 font-figtree inline-block'
          >
            Become a Member
          </NavLoadingLink>
        </li>
      </ul>
    </nav>
  )
}
