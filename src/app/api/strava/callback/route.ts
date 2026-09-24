import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { StravaError, exchangeCode } from '@/lib/strava/client'
import { saveConnection } from '@/lib/strava/connection'
import { syncAthlete } from '@/lib/strava/sync'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

/** Shown by the profile's Strava card; keep in sync with STRAVA_ERROR_MESSAGES there. */
type CallbackError = 'denied' | 'invalid_state' | 'scope' | 'capacity' | 'already_linked' | 'failed'

/** Strava's `scope` query param lists what the athlete actually ticked. */
const REQUIRED_SCOPE = 'activity:read'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const cookieStore = await cookies()
  const storedState = cookieStore.get('strava_oauth_state')?.value
  cookieStore.delete('strava_oauth_state')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${SITE_URL}/become-a-member`)

  const { data: profile } = await adminClient
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single()
  const profilePath = profile?.username ? `/profile/${profile.username}` : '/'
  const back = (query: string) => NextResponse.redirect(`${SITE_URL}${profilePath}?${query}#strava`)
  const fail = (reason: CallbackError) => back(`strava_error=${reason}`)

  if (searchParams.get('error')) return fail('denied')

  const state = searchParams.get('state')
  if (!state || !storedState || state !== storedState) return fail('invalid_state')

  const code = searchParams.get('code')
  if (!code) return fail('failed')

  const grantedScope = searchParams.get('scope') ?? ''
  if (!grantedScope.split(',').includes(REQUIRED_SCOPE)) return fail('scope')

  try {
    const exchange = await exchangeCode(code)
    const saved = await saveConnection(user.id, exchange, grantedScope)
    if (!saved.ok) return fail(saved.reason)
  } catch (err) {
    if (err instanceof StravaError && err.kind === 'capacity') return fail('capacity')
    console.error('[strava] callback exchange failed', {
      userId: user.id,
      kind: err instanceof StravaError ? err.kind : 'unexpected',
      reason: err instanceof Error ? err.message : 'unknown',
    })
    return fail('failed')
  }

  // The link is saved; a failed first sync is retried by the daily cron and
  // the next webhook, so it isn't reported as a connection failure.
  await syncAthlete(user.id, { force: true })
  return back('strava_connected=1')
}
