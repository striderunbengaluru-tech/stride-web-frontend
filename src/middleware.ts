import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/admin']
const AUTH_PATHS = ['/become-a-member', '/login', '/register']

/**
 * Runs on `/admin/*` and the three auth paths ONLY — see `config.matcher`.
 *
 * It used to run on every non-asset request, which meant `getClaims()` (an
 * asymmetric JWT verification, so real CPU) executed for anonymous traffic,
 * search-engine crawls, and every one of Next's background `.segment` prefetch
 * requests. On a static home page that is pure waste: the answer is always
 * "not signed in", and nothing downstream reads it. It was the single largest
 * consumer of the project's compute budget.
 *
 * Public pages no longer touch middleware at all, so they cost no invocation
 * and no CPU. Two consequences worth knowing:
 *
 *  - Supabase's server-side cookie refresh no longer happens on public
 *    navigations. That is safe here because the session is driven from the
 *    browser (`components/auth/auth-provider.tsx` + supabase-js auto-refresh),
 *    and every server component that needs auth builds its own client via
 *    `lib/supabase/server.ts`, which refreshes through the same cookie
 *    callbacks. Admin routes still pass through here on every request.
 *
 *  - `Accept: text/markdown` negotiation moved to `rewrites()` in
 *    next.config.ts, where it is handled by the routing layer without invoking
 *    a function at all. `/md/[[...slug]]` re-checks the path allowlist itself,
 *    so nothing was loosened by the move.
 */
export async function middleware(request: NextRequest) {
  // Supabase SSR requires refreshing the session on every request it sees.
  // We must update the response cookies so the session stays alive.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add logic between createServerClient and getClaims().
  // getClaims() verifies the JWT locally against the project's public keys
  // (asymmetric signing) — no network round trip per request, unlike
  // getUser(). Session cookies still refresh through the same @supabase/ssr
  // cookie callbacks above. Admin routes re-verify with getUser() + a fresh
  // DB role read in their own layout, so middleware only needs a valid session.
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  if (isProtected && !claims) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/become-a-member'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (AUTH_PATHS.includes(pathname) && claims) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  // Deliberately explicit rather than a negated catch-all. Every path listed
  // here needs a session read; every path NOT listed must never pay for one.
  // Adding a route that needs auth means adding it here on purpose.
  matcher: ['/admin/:path*', '/become-a-member', '/login', '/register'],
}
