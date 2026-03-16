import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getStravaOAuthUrl } from '@/lib/strava'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('strava_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const redirectUri = `${SITE_URL}/api/strava/callback`
  return NextResponse.redirect(getStravaOAuthUrl(redirectUri, state))
}
