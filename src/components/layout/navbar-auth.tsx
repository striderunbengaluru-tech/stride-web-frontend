'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSyncExternalStore } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { hasSessionCookie } from '@/lib/auth/session-cache'
import { NavbarMemberCta } from './navbar-member-cta'
import { HideOnAdminRoute } from './navbar-gate'

// UserMenu statically imports the Supabase browser client (for sign-out), and
// this island sits in the root layout — so importing it eagerly put ~55 KB gzip
// of supabase-js on the hydration critical path of EVERY page, defeating the
// deferral in AuthProvider. It only renders once a session has resolved
// client-side, so loading it on demand costs nothing visually.
const UserMenu = dynamic(() => import('./user-menu'), {
  ssr: false,
  loading: () => <UserMenuSkeleton />,
})

/** Same footprint as the UserMenu trigger, so nothing shifts when it arrives. */
function UserMenuSkeleton() {
  return (
    <div className='flex min-h-11 items-center gap-2 px-1.5 sm:pl-1.5 sm:pr-2.5' aria-busy='true'>
      <span className='sr-only'>Loading your account</span>
      <span className='h-8 w-8 shrink-0 rounded-full bg-white/10 animate-pulse' aria-hidden='true' />
      <span className='hidden h-3.5 w-20 rounded bg-white/10 animate-pulse sm:block' aria-hidden='true' />
      <span className='hidden h-3.5 w-3.5 rounded bg-white/10 animate-pulse sm:block' aria-hidden='true' />
    </div>
  )
}

// The cookie never changes without a navigation or an auth event (which the
// provider already turns into a re-render), so there's nothing to subscribe to.
const noSubscription = () => () => {}

/**
 * True when the browser holds a session cookie. The server snapshot is false,
 * so the prerendered HTML (shared by every visitor) contains no skeleton; it
 * appears right after hydration, only for visitors who are likely signed in.
 */
function useHasSessionCookie(): boolean {
  return useSyncExternalStore(noSubscription, hasSessionCookie, () => false)
}

// Client auth island for the static navbar shell. While a signed-in visitor's
// session and profile resolve (supabase-js lazy-load + one profile query),
// shows a skeleton of the user menu; signed-out visitors resolve within a frame
// and see the CTA pair. Display-only — authorization is enforced server-side.
export function NavbarAuth() {
  const { status, navProfile } = useAuth()
  const likelySignedIn = useHasSessionCookie()

  if (status === 'loading') return likelySignedIn ? <UserMenuSkeleton /> : null

  if (status === 'signed-in') {
    if (!navProfile) return <UserMenuSkeleton />
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
