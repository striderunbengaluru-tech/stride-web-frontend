import { NextResponse, type NextRequest, after } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { sendWelcomeEmailOnce } from '@/lib/email/send-hooks'

// Supabase redirects here after Google OAuth completes (PKCE flow).
// Exchange the one-time code for a session, then forward to the user's profile
// — or back to the page that initiated sign-in (stored in `stride_next` cookie).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Resolve next path from cookie first (most reliable), then fall back to ?next= query.
  // Only relative paths are accepted to prevent open-redirect attacks.
  const cookieStore = await cookies()
  const cookieNext = cookieStore.get('stride_next')?.value
  const decodedCookieNext = cookieNext ? decodeURIComponent(cookieNext) : null
  const queryNext = searchParams.get('next')
  const candidate = decodedCookieNext ?? queryNext
  const nextPath = candidate && candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : null

  function redirectWithCleanup(url: string) {
    const response = NextResponse.redirect(url)
    if (cookieNext) {
      response.cookies.set('stride_next', '', { path: '/', maxAge: 0 })
    }
    return response
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Use adminClient to bypass RLS — the user row may not exist yet if the
        // trigger fired but the session client's RLS view hasn't caught up.
        let { data: profile } = await adminClient
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()

        // Fallback: trigger may have failed silently — create the row now.
        if (!profile) {
          const base = (user.email ?? '')
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_') || `user_${user.id.slice(0, 8)}`

          // Find a unique username
          let username = base
          let suffix = 0
          while (true) {
            const { count } = await adminClient
              .from('users')
              .select('id', { count: 'exact', head: true })
              .eq('username', username)
            if (!count) break
            suffix++
            username = `${base}_${suffix}`
          }

          const { data: upserted } = await adminClient
            .from('users')
            .upsert(
              {
                id: user.id,
                email: user.email,
                username,
                full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
                avatar_url: user.user_metadata?.avatar_url ?? null,
                role: 'GUEST',
              },
              { onConflict: 'id' }
            )
            .select('username')
            .single()

          profile = upserted
        }

        // First-ever sign-in gets a welcome email — the atomic claim inside
        // makes this a no-op for returning users, so it's safe on every login.
        after(() => sendWelcomeEmailOnce(user.id))

        // Prefer the validated next path if provided, else profile page
        if (nextPath) {
          return redirectWithCleanup(`${origin}${nextPath}`)
        }
        if (profile?.username) {
          return redirectWithCleanup(`${origin}/profile/${profile.username}`)
        }
      }
    }
  }

  return redirectWithCleanup(`${origin}/`)
}
