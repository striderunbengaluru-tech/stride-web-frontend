'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { AUTHED_KEY, NAV_PROFILE_KEY, clearAuthCaches } from '@/lib/auth/session-cache'
import { shouldRefreshForAuthChange, isOnNotFoundRoute } from '@/lib/auth/refresh-guard'
import type { Role } from '@/types/auth'

// supabase-js and sonner are BOTH loaded lazily and deliberately absent from
// the static import graph. This provider lives in the root layout, so anything
// it imports statically lands on the hydration critical path of every page —
// supabase-js alone is ~55 KB gzip (it bundles RealtimeClient and a base64
// shim this app never uses). Deferring them is what lets the page become
// interactive before that JS has even been fetched.
const Toaster = dynamic(() => import('sonner').then(m => m.Toaster), { ssr: false })


export type NavProfile = {
  username: string
  firstName: string
  avatarUrl: string | null
  isAdmin: boolean
  /** Full role, so the menu can route a LEAD to check-in rather than /admin. */
  role: Role
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<AuthContextValue>({ status: 'loading', navProfile: null })

  useEffect(() => {
    // Synchronous, free, and the whole point of the deferral: @supabase/ssr
    // stores the session in `sb-<projectRef>-auth-token` (suffixed .0/.1 when
    // chunked). The key is derived exactly the way supabase-js derives it, so a
    // signed-out visitor is resolved here and never downloads supabase-js at all.
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]
    if (!document.cookie.includes(`sb-${projectRef}-auth-token`)) {
      setState({ status: 'signed-out', navProfile: null })
      return
    }

    let cancelled = false
    // Assigned once the lazily-imported client has attached its listener. The
    // cleanup below may run before that resolves, hence the guard.
    let unsubscribe: (() => void) | undefined

    void (async () => {
      const [{ createClient }, { toast }] = await Promise.all([
        import('@/lib/supabase/client'),
        import('sonner'),
      ])
      if (cancelled) return
      const supabase = createClient()

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
            // Carried separately from isAdmin: a lead is not a lesser admin, so
            // nothing that gates on isAdmin should start matching them. This
            // only decides which portal link their menu offers.
            role: (profile.role as NavProfile['role']) ?? 'GUEST',
            email,
          }
          try {
            sessionStorage.setItem(`${NAV_PROFILE_KEY}:${userId}`, JSON.stringify(navProfile))
          } catch {
            // best-effort cache only
          }
          setState({ status: 'signed-in', navProfile })
          return
        }

        // No profile row. Two very different causes: a brand-new OAuth user
        // whose row is still being created by the handle_new_user trigger, or an
        // account that has since been erased. getSession() above can't tell them
        // apart — it only reads the locally stored token — so ask the auth
        // server, which is the one party that knows whether the user still
        // exists. Without this, a deleted account kept rendering from its
        // sessionStorage cache: the row was gone, but this branch left the
        // cached name and avatar on screen untouched.
        const { data: { user: liveUser } } = await supabase.auth.getUser()
        if (cancelled) return

        if (!liveUser) {
          // Erased elsewhere (this device, another device, or the inactivity
          // purge). Drop the caches and the local session cookie so the tab
          // stops presenting a signed-in account that no longer exists.
          clearAuthCaches()
          try {
            await supabase.auth.signOut({ scope: 'local' })
          } catch {
            // Already unauthenticated as far as the server is concerned.
          }
          if (!cancelled) setState({ status: 'signed-out', navProfile: null })
          return
        }

        // Genuinely mid-signup — report signed-in so the UI doesn't offer
        // sign-up CTAs to someone who just signed up.
        if (!cached) setState({ status: 'signed-in', navProfile: null })
      }

      // Initial state from the locally-stored session — no network round trip
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return
        // Seeds the refresh guard's baseline: whatever the session is right now
        // is what the server render already reflects, so it is not a change.
        shouldRefreshForAuthChange(session?.user?.id ?? null)
        if (session?.user) void loadProfile(session.user.id, session.user.email ?? null)
        else setState({ status: 'signed-out', navProfile: null })
      })

      /**
       * Refreshes the server render, but only when it is both needed and
       * possible.
       *
       * `router.refresh()` used to be called unconditionally here, and that was
       * the cause of the 404 reload loop: supabase-js emits SIGNED_IN on
       * ordinary initialisation as well as on a real sign-in, and a refresh on a
       * not-found route refetches an RSC payload that answers HTTP 404, which
       * the App Router can only recover from with a full document reload —
       * which remounts this provider and fires the event again. See
       * @/lib/auth/refresh-guard for the whole chain.
       */
      const refreshIfIdentityChanged = (userId: string | null) => {
        if (!shouldRefreshForAuthChange(userId)) return
        // Even a legitimate refresh cannot be applied on a not-found render.
        if (isOnNotFoundRoute()) return
        router.refresh()
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          refreshIfIdentityChanged(session?.user?.id ?? null)
          if (session?.user) void loadProfile(session.user.id, session.user.email ?? null)
          // Only toast on an actual new sign-in, not on every session restoration
          if (!sessionStorage.getItem(AUTHED_KEY)) {
            sessionStorage.setItem(AUTHED_KEY, '1')
            toast.success('Signed in successfully!', { id: 'signed-in' })
          }
        } else if (event === 'SIGNED_OUT') {
          clearAuthCaches()
          setState({ status: 'signed-out', navProfile: null })
          refreshIfIdentityChanged(null)
          toast.info('Signed out successfully.', { id: 'signed-out' })
        } else if (event === 'USER_UPDATED') {
          // A profile edit changes what the server rendered even though the
          // identity is unchanged, so this one refreshes on its own terms —
          // still never on a not-found route.
          if (!isOnNotFoundRoute()) router.refresh()
          if (session?.user) void loadProfile(session.user.id, session.user.email ?? null)
        }
        // TOKEN_REFRESHED — silent, no action needed
      })

      unsubscribe = () => subscription.unsubscribe()
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [router])

  return (
    <AuthContext.Provider value={state}>
      {children}
      <Toaster position='bottom-right' theme='dark' richColors duration={3000} />
    </AuthContext.Provider>
  )
}
