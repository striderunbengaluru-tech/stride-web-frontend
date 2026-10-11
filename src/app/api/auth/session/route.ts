import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Matches @supabase/ssr's own lifetime for the session cookie.
const SESSION_COOKIE_MAX_AGE_S = 400 * 24 * 60 * 60

// `sb-<projectRef>-auth-token`, plus its `.0`/`.1` chunks when the session is
// large. Deliberately excludes the short-lived `-code-verifier` PKCE cookie.
const SESSION_COOKIE_PATTERN = /^sb-[a-z0-9]+-auth-token(\.\d+)?$/

const SESSION_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  // The browser client reads this cookie, so it cannot be httpOnly — same as
  // every other writer of it.
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_COOKIE_MAX_AGE_S,
} as const

/**
 * Re-issues the caller's session cookie from the server.
 *
 * Since middleware stopped running on public pages, nearly every token refresh
 * happens in the browser, which writes the cookie through `document.cookie`.
 * Safari's ITP caps script-written cookies at 7 days — and at 24 hours when the
 * visitor arrived from a decorated link off a tracker-classified domain, which
 * is how most people reach Stride (Instagram). The result was Safari users
 * signed out after closing the browser. A `Set-Cookie` from our own origin is
 * not capped, so AuthProvider calls this once per tab to swap the capped cookie
 * for a server-written one.
 *
 * Returns 204 and never a body: the only effect is on the caller's own cookies.
 */
export async function POST(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 })
  let refreshed = false

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          refreshed = true
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, secure: SESSION_COOKIE_OPTIONS.secure })
          )
        },
      },
    }
  )

  // getUser() validates the session with the auth server and, if the access
  // token has expired, refreshes it — which writes fresh cookies via setAll.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  // No refresh happened, so the request's cookies are current: write the same
  // values back, this time from the server.
  if (!refreshed) {
    request.cookies
      .getAll()
      .filter(({ name }) => SESSION_COOKIE_PATTERN.test(name))
      .forEach(({ name, value }) => response.cookies.set(name, value, SESSION_COOKIE_OPTIONS))
  }

  return response
}
