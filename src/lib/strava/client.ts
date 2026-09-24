import { z } from 'zod'

// Thin, typed wrapper over the handful of Strava endpoints Stride uses. Every
// response is Zod-parsed: Strava is an external source, and a shape change on
// their side should fail loudly here rather than write junk to the database.

const OAUTH_BASE = 'https://www.strava.com/oauth'
const API_BASE = 'https://www.strava.com/api/v3'
const REQUEST_TIMEOUT_MS = 10_000

/**
 * - `revoked`: the athlete removed Stride from their Strava settings, so the
 *   refresh token is dead. Their data must be deleted.
 * - `capacity`: the app's connected-athlete limit is reached (403 on exchange).
 * - `unauthorized`: an API call got 401. Not proof of revocation on its own —
 *   the caller refreshes the token and retries once before concluding that.
 * - `rate_limited`: 429 — try again on the next sync.
 */
export type StravaErrorKind = 'revoked' | 'unauthorized' | 'capacity' | 'rate_limited' | 'failed'

export class StravaError extends Error {
  constructor(readonly kind: StravaErrorKind, message: string) {
    super(message)
    this.name = 'StravaError'
  }
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().int(), // epoch seconds
})

const exchangeResponseSchema = tokenResponseSchema.extend({
  athlete: z.object({ id: z.number().int() }),
})

const statsSchema = z.object({
  ytd_run_totals: z.object({
    count: z.number().int(),
    distance: z.number(), // metres
  }),
})

const activitySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  sport_type: z.string(),
  start_date: z.string(),
  utc_offset: z.number().default(0),
  distance: z.number(),
  moving_time: z.number().int(),
  elapsed_time: z.number().int(),
  total_elevation_gain: z.number().default(0),
  visibility: z.string().optional(),
  private: z.boolean().optional(),
  map: z.object({ summary_polyline: z.string().nullish() }).nullish(),
})

export type StravaTokens = z.infer<typeof tokenResponseSchema>
export type StravaExchange = z.infer<typeof exchangeResponseSchema>
export type StravaSummaryActivity = z.infer<typeof activitySchema>
export type StravaYtdRuns = { count: number; distanceM: number }

function credentials() {
  const clientId = process.env.STRIDE_STRAVA_CLIENT_ID
  const clientSecret = process.env.STRIDE_STRAVA_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new StravaError('failed', 'Strava client credentials are not configured')
  return { client_id: clientId, client_secret: clientSecret }
}

async function postOAuth(path: string, body: Record<string, string>): Promise<Response> {
  return fetch(`${OAUTH_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
}

async function getApi(path: string, accessToken: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (res.status === 401) throw new StravaError('unauthorized', `Strava ${path} returned 401`)
  if (res.status === 429) throw new StravaError('rate_limited', `Strava ${path} rate limited`)
  if (!res.ok) throw new StravaError('failed', `Strava ${path} returned ${res.status}`)
  return res.json()
}

export function getStravaAuthorizeUrl(redirectUri: string, state: string, scope: string): string {
  const params = new URLSearchParams({
    client_id: credentials().client_id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    // Always show Strava's consent screen, so the athlete sees exactly what
    // they're granting and can pick the right account.
    approval_prompt: 'force',
    state,
  })
  return `${OAUTH_BASE}/authorize?${params.toString()}`
}

const oauthErrorSchema = z.object({
  errors: z.array(z.object({ resource: z.string(), field: z.string(), code: z.string() })).default([]),
})

/**
 * Strava's OAuth errors name the offending field ("Application client_secret
 * invalid") and never echo a credential back, so they're safe to log — and
 * without them a failed exchange is undiagnosable.
 */
async function describeOAuthError(res: Response): Promise<string> {
  const parsed = oauthErrorSchema.safeParse(await res.json().catch(() => ({})))
  const details = parsed.success
    ? parsed.data.errors.map(e => `${e.resource} ${e.field} ${e.code}`).join('; ')
    : ''
  return `status ${res.status}${details ? ` (${details})` : ''}`
}

export async function exchangeCode(code: string): Promise<StravaExchange> {
  const res = await postOAuth('token', { ...credentials(), code, grant_type: 'authorization_code' })
  // Strava answers 403 "Limit of connected athletes exceeded" once the app's
  // athlete cap is reached.
  if (res.status === 403) throw new StravaError('capacity', 'Strava athlete limit reached')
  if (res.status === 429) throw new StravaError('rate_limited', 'Strava token exchange rate limited')
  if (!res.ok) throw new StravaError('failed', `Strava token exchange failed: ${await describeOAuthError(res)}`)
  return exchangeResponseSchema.parse(await res.json())
}

export async function refreshTokens(refreshToken: string): Promise<StravaTokens> {
  const res = await postOAuth('token', {
    ...credentials(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  // 400 invalid_grant / 401: the athlete deauthorised Stride on Strava.
  if (res.status === 400 || res.status === 401) throw new StravaError('revoked', 'Strava refresh token rejected')
  if (res.status === 429) throw new StravaError('rate_limited', 'Strava token refresh rate limited')
  if (!res.ok) throw new StravaError('failed', `Strava token refresh failed: ${await describeOAuthError(res)}`)
  return tokenResponseSchema.parse(await res.json())
}

export async function getYtdRunTotals(athleteId: number, accessToken: string): Promise<StravaYtdRuns> {
  const stats = statsSchema.parse(await getApi(`/athletes/${athleteId}/stats`, accessToken))
  return {
    count: stats.ytd_run_totals.count,
    distanceM: Math.round(stats.ytd_run_totals.distance),
  }
}

export async function listRecentActivities(accessToken: string, perPage: number): Promise<StravaSummaryActivity[]> {
  const data = await getApi(`/athlete/activities?per_page=${perPage}`, accessToken)
  return z.array(activitySchema).parse(data)
}

/** Best effort — the caller deletes local data whether or not this succeeds. */
export async function deauthorize(accessToken: string): Promise<void> {
  const res = await postOAuth('deauthorize', { access_token: accessToken })
  if (!res.ok && res.status !== 401) {
    throw new StravaError('failed', `Strava deauthorize returned ${res.status}`)
  }
}
