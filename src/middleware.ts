import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/admin']
const AUTH_PATHS = ['/become-a-member', '/login', '/register']

export async function middleware(request: NextRequest) {
  // Supabase SSR requires refreshing the session on every request.
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
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)',
  ],
}
