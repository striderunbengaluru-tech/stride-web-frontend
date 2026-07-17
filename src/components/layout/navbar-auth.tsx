'use client'

import Link from 'next/link'
import clsx from 'clsx'
import { useAuth } from '@/components/auth/auth-provider'
import { PREVIEW_FEATURES_ENABLED } from '@/lib/feature-flags'
import UserMenu from './user-menu'
import { NavbarMemberCta } from './navbar-member-cta'
import { HideOnAdminRoute } from './navbar-gate'

// Client auth island for the static navbar shell. Renders nothing while the
// local session resolves (a frame or two after hydration), then either the
// user menu or the logged-out CTA pair. Display-only — authorization is
// enforced server-side.
export function NavbarAuth() {
  const { status, navProfile } = useAuth()

  if (status === 'loading') return null

  if (status === 'signed-in') {
    if (!navProfile) return null
    return (
      <UserMenu
        username={navProfile.username}
        firstName={navProfile.firstName}
        avatarUrl={navProfile.avatarUrl}
        isAdmin={navProfile.isAdmin}
        email={navProfile.email}
      />
    )
  }

  return (
    <HideOnAdminRoute>
      <div className='hidden md:flex items-center'>
        <Link
          href='/partnerships'
          className={clsx(
            'inline-flex items-center font-bold px-4 py-2 rounded-md text-sm transition-all duration-150',
            PREVIEW_FEATURES_ENABLED
              ? 'bg-white/10 backdrop-blur-md border border-white/15 text-white hover:border-stride-yellow-accent/50'
              : 'bg-stride-yellow-accent text-copy-black hover:scale-[1.03] hover:shadow-lg hover:shadow-stride-yellow-accent/25 active:scale-[0.97]'
          )}
        >
          Partner With Us
        </Link>
        {/* Reveals itself only once the homepage hero CTA scrolls out of
            view — the same CTA never shows twice in one fold */}
        {PREVIEW_FEATURES_ENABLED && <NavbarMemberCta />}
      </div>
    </HideOnAdminRoute>
  )
}
