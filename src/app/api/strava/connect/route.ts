import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getStravaAuthorizeUrl } from '@/lib/strava/client'
import { STRAVA_SCOPE } from '@/lib/strava/config'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!
const STATE_MAX_AGE_S = 600

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // CSRF protection for the OAuth round trip: the callback only accepts a
  // `state` that matches this httpOnly cookie.
  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('strava_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STATE_MAX_AGE_S,
    path: '/',
  })

  const redirectUri = `${SITE_URL}/api/strava/callback`
  return NextResponse.redirect(getStravaAuthorizeUrl(redirectUri, state, STRAVA_SCOPE))
}
