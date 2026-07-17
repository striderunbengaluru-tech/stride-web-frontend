'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast, Toaster } from 'sonner'

// sessionStorage keys — cleared on sign-out so the next real sign-in shows the
// toast again / refetches the nav profile.
const AUTHED_KEY = '_stride_authed'
const NAV_PROFILE_KEY = '_stride_nav_profile'

export type NavProfile = {
  username: string
  firstName: string
  avatarUrl: string | null
  isAdmin: boolean
  email: string | null
}

type AuthStatus = 'loading' | 'signed-in' | 'signed-out'

type AuthContextValue = {
  status: AuthStatus
  navProfile: NavProfile | null
}

// Client-side auth state for the static shell. The navbar/footer/hero auth UI
// reads this context instead of doing server-side getUser() — that's what
// lets the root layout (and therefore every public page) prerender statically.
// The session check is local (cookie/localStorage, no network); the one
// profile query is cached in sessionStorage so repeat views render instantly.
// This is display-only state — real authorization stays server-side
// (middleware, admin layout, requireAdmin()).
const AuthContext = createContext<AuthContextValue>({ status: 'loading', navProfile: null })

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

function readCachedProfile(userId: string): NavProfile | null {
  try {
    const raw = sessionStorage.getItem(`${NAV_PROFILE_KEY}:${userId}`)
    return raw ? (JSON.parse(raw) as NavProfile) : null
  } catch {
    return null
  }
}

function clearCachedProfiles() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(NAV_PROFILE_KEY)) sessionStorage.removeItem(key)
    }
  } catch {
    // sessionStorage unavailable — nothing to clear
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<AuthContextValue>({ status: 'loading', navProfile: null })

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function loadProfile(userId: string, email: string | null) {
      const cached = readCachedProfile(userId)
      if (cached && !cancelled) setState({ status: 'signed-in', navProfile: cached })

      const { data: profile } = await supabase
        .from('users')
        .select('username, full_name, avatar_url, role')
        .eq('id', userId)
        .single()
      if (cancelled) return

      if (profile) {
        const navProfile: NavProfile = {
          username: profile.username ?? userId,
          firstName: profile.full_name?.split(' ')[0] ?? profile.username ?? 'You',
          avatarUrl: profile.avatar_url ?? null,
          isAdmin: profile.role === 'ADMIN',
          email,
        }
        try {
          sessionStorage.setItem(`${NAV_PROFILE_KEY}:${userId}`, JSON.stringify(navProfile))
        } catch {
          // best-effort cache only
        }
        setState({ status: 'signed-in', navProfile })
      } else if (!cached) {
        // Signed in but no profile row yet (fresh OAuth user mid-trigger) —
        // still report signed-in so the UI doesn't show sign-up CTAs.
        setState({ status: 'signed-in', navProfile: null })
      }
    }

    // Initial state from the locally-stored session — no network round trip
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (session?.user) void loadProfile(session.user.id, session.user.email ?? null)
      else setState({ status: 'signed-out', navProfile: null })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        router.refresh()
        if (session?.user) void loadProfile(session.user.id, session.user.email ?? null)
        // Only toast on an actual new sign-in, not on every session restoration
        if (!sessionStorage.getItem(AUTHED_KEY)) {
          sessionStorage.setItem(AUTHED_KEY, '1')
          toast.success('Signed in successfully!', { id: 'signed-in' })
        }
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(AUTHED_KEY)
        clearCachedProfiles()
        setState({ status: 'signed-out', navProfile: null })
        router.refresh()
        toast.info('Signed out successfully.', { id: 'signed-out' })
      } else if (event === 'USER_UPDATED') {
        router.refresh()
        if (session?.user) void loadProfile(session.user.id, session.user.email ?? null)
      }
      // TOKEN_REFRESHED — silent, no action needed
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [router])

  return (
    <AuthContext.Provider value={state}>
      {children}
      <Toaster position='bottom-right' theme='dark' richColors duration={3000} />
    </AuthContext.Provider>
  )
}
