import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { exchangeStravaCode, fetchAndStoreStravaData } from '@/lib/strava'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${SITE_URL}/profile?strava_error=denied`)
  }

  const cookieStore = await cookies()
  const storedState = cookieStore.get('strava_oauth_state')?.value
  cookieStore.delete('strava_oauth_state')

  if (!state || state !== storedState) {
    return NextResponse.redirect(`${SITE_URL}/profile?strava_error=invalid_state`)
  }

  if (!code) {
    return NextResponse.redirect(`${SITE_URL}/profile?strava_error=no_code`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${SITE_URL}/login`)

  // Exchange the authorization code for a one-time access token.
  // This token belongs to the athlete who just authenticated on Strava —
  // it is used immediately to pull their data and then discarded (never stored).
  const accessToken = await exchangeStravaCode(code)
  if (!accessToken) {
    return NextResponse.redirect(`${SITE_URL}/profile?strava_error=exchange_failed`)
  }

  await fetchAndStoreStravaData(user.id, accessToken)

  const { data: profile } = await adminClient
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single()

  const redirectPath = profile?.username ? `/profile/${profile.username}` : '/profile'
  return NextResponse.redirect(`${SITE_URL}${redirectPath}?strava_connected=1`)
}
