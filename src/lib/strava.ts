import { adminClient } from '@/lib/supabase/admin'
import type { StravaActivity, StravaPBs } from '@/types/strava'

const STRAVA_CLIENT_ID = process.env.STRIDE_STRAVA_CLIENT_ID!
const STRAVA_CLIENT_SECRET = process.env.STRIDE_STRAVA_CLIENT_SECRET!
const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

const PB_BUCKETS = [
  { key: 'mile' as const, minM: 1500, maxM: 1900 },
  { key: '5k' as const, minM: 4800, maxM: 5400 },
  { key: '10k' as const, minM: 9600, maxM: 10500 },
  { key: 'half' as const, minM: 20500, maxM: 22000 },
  { key: 'full' as const, minM: 41800, maxM: 43000 },
]

function computePBs(activities: StravaActivity[]): StravaPBs {
  const pbs: StravaPBs = { mile: null, '5k': null, '10k': null, half: null, full: null }

  for (const act of activities) {
    const isRun = act.type === 'Run' || act.sport_type === 'Run'
    if (!isRun) continue

    for (const bucket of PB_BUCKETS) {
      if (act.distance >= bucket.minM && act.distance <= bucket.maxM) {
        const current = pbs[bucket.key]
        if (!current || act.moving_time < current.time) {
          pbs[bucket.key] = {
            time: act.moving_time,
            date: act.start_date,
            activityId: act.id,
          }
        }
      }
    }
  }

  return pbs
}

/**
 * Exchange the Strava authorization code for a one-time access token.
 * The token is used immediately to fetch data and is NOT stored.
 */
export async function exchangeStravaCode(code: string): Promise<string | null> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) return null

  const data = await res.json() as { access_token: string }
  return data.access_token
}

/**
 * Fetch the authenticated athlete's activities using a one-time access token,
 * compute personal bests, and persist only the computed data to the DB.
 * The access token itself is never stored.
 */
export async function fetchAndStoreStravaData(userId: string, accessToken: string): Promise<boolean> {
  const [page1Res, page2Res] = await Promise.all([
    fetch(`${STRAVA_API_BASE}/athlete/activities?per_page=50&page=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`${STRAVA_API_BASE}/athlete/activities?per_page=50&page=2`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ])

  const page1: StravaActivity[] = page1Res.ok ? await page1Res.json() : []
  const page2: StravaActivity[] = page2Res.ok ? await page2Res.json() : []
  const allActivities = [...page1, ...page2]

  const runs = allActivities.filter((a) => a.type === 'Run' || a.sport_type === 'Run')
  const recentFive = runs.slice(0, 5)
  const pbs = computePBs(runs)

  const { error } = await adminClient
    .from('users')
    .update({
      strava_connected: true,
      strava_pbs: JSON.stringify(pbs),
      strava_recent_activities: JSON.stringify(recentFive),
      strava_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return !error
}

/**
 * Clear all stored Strava data for a user (does not require a Strava API call).
 */
export async function clearStravaData(userId: string): Promise<void> {
  await adminClient
    .from('users')
    .update({
      strava_connected: false,
      strava_pbs: '{}',
      strava_recent_activities: '[]',
      strava_synced_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

export function getStravaOAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read,activity:read_all',
    approval_prompt: 'force', // always show the Strava auth page so the user can pick their account
    state,
  })
  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}
