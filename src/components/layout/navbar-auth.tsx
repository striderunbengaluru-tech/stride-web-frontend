'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAuth } from '@/components/auth/auth-provider'
import { NavbarMemberCta } from './navbar-member-cta'
import { HideOnAdminRoute } from './navbar-gate'

// UserMenu statically imports the Supabase browser client (for sign-out), and
// this island sits in the root layout — so importing it eagerly put ~55 KB gzip
// of supabase-js on the hydration critical path of EVERY page, defeating the
// deferral in AuthProvider. It only renders once a session has resolved
// client-side, so loading it on demand costs nothing visually.
const UserMenu = dynamic(() => import('./user-menu'), { ssr: false })

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
        role={navProfile.role}
        email={navProfile.email}
      />
    )
  }

  return (
    <HideOnAdminRoute>
      <div className='hidden md:flex items-center'>
        {/* Secondary to the Become-a-Member CTA that sits beside it */}
        <Link
          href='/partnerships'
          className='inline-flex items-center font-bold px-4 py-2 rounded-md text-sm transition-all duration-150 bg-white/10 backdrop-blur-md border border-white/15 text-white hover:border-stride-yellow-accent/50'
        >
          Partner With Us
        </Link>
        {/* Reveals itself only once the homepage hero CTA scrolls out of
            view — the same CTA never shows twice in one fold */}
        <NavbarMemberCta />
      </div>
    </HideOnAdminRoute>
  )
}
