import { adminClient } from '@/lib/supabase/admin'
import { istDayKey } from '@/lib/utils/ist'
import { decryptToken, encryptToken } from './crypto'
import { deauthorize, refreshTokens, type StravaExchange } from './client'

// Owns the `strava_connections` row: creating it from an OAuth exchange,
// handing out a live access token, and removing it (plus every synced
// activity) on disconnect, revocation or account deletion.

/** Refresh when the access token has less than this left (Strava tokens last 6 h). */
const REFRESH_MARGIN_MS = 5 * 60_000

const CONNECTION_COLUMNS =
  'user_id, athlete_id, access_token_enc, refresh_token_enc, token_expires_at, ytd_run_distance_m, ytd_year, last_synced_at'

export type StravaConnection = {
  user_id: string
  athlete_id: number
  access_token_enc: string
  refresh_token_enc: string
  token_expires_at: string
  ytd_run_distance_m: number
  ytd_year: number
  last_synced_at: string | null
}

/** The civil year in IST — the year the km board is counting. */
export function currentIstYear(): number {
  return Number(istDayKey(Date.now()).slice(0, 4))
}

export async function getConnection(userId: string): Promise<StravaConnection | null> {
  const { data, error } = await adminClient
    .from('strava_connections')
    .select(CONNECTION_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`strava_connections read failed: ${error.message}`)
  return data as StravaConnection | null
}

export async function getConnectionByAthlete(athleteId: number): Promise<StravaConnection | null> {
  const { data, error } = await adminClient
    .from('strava_connections')
    .select(CONNECTION_COLUMNS)
    .eq('athlete_id', athleteId)
    .maybeSingle()
  if (error) throw new Error(`strava_connections read failed: ${error.message}`)
  return data as StravaConnection | null
}

export type SaveConnectionResult = { ok: true } | { ok: false; reason: 'already_linked' | 'failed' }

/**
 * Stores (or replaces) the caller's link. A Strava account already linked to a
 * *different* Stride member is refused, so one athlete's kilometres can't be
 * counted twice on the board.
 */
export async function saveConnection(
  userId: string,
  exchange: StravaExchange,
  scope: string
): Promise<SaveConnectionResult> {
  const existing = await getConnectionByAthlete(exchange.athlete.id)
  if (existing && existing.user_id !== userId) return { ok: false, reason: 'already_linked' }

  const { error } = await adminClient.from('strava_connections').upsert(
    {
      user_id: userId,
      athlete_id: exchange.athlete.id,
      access_token_enc: encryptToken(exchange.access_token),
      refresh_token_enc: encryptToken(exchange.refresh_token),
      token_expires_at: new Date(exchange.expires_at * 1000).toISOString(),
      scope,
      ytd_year: currentIstYear(),
      connected_at: new Date().toISOString(),
      last_synced_at: null,
    },
    { onConflict: 'user_id' }
  )
  if (error) {
    console.error('[strava] saveConnection failed', { userId, code: error.code })
    return { ok: false, reason: 'failed' }
  }
  return { ok: true }
}

/**
 * A usable access token, refreshing (and persisting the rotated pair) when the
 * current one is about to expire or `forceRefresh` is set. Throws
 * StravaError('revoked') when Strava rejects the refresh token.
 */
export async function getAccessToken(
  connection: StravaConnection,
  { forceRefresh = false }: { forceRefresh?: boolean } = {}
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at).getTime()
  if (!forceRefresh && expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return decryptToken(connection.access_token_enc)
  }

  const tokens = await refreshTokens(decryptToken(connection.refresh_token_enc))
  const update = {
    access_token_enc: encryptToken(tokens.access_token),
    refresh_token_enc: encryptToken(tokens.refresh_token),
    token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
  }
  const { error } = await adminClient
    .from('strava_connections')
    .update(update)
    .eq('user_id', connection.user_id)
  if (error) throw new Error(`strava token persist failed: ${error.message}`)

  Object.assign(connection, update)
  return tokens.access_token
}

/**
 * Deletes the link and every synced activity. With `revokeOnStrava`, first
 * asks Strava to deauthorise Stride (best effort — local data is deleted
 * regardless, which is the part the member is owed).
 */
export async function removeStravaConnection(
  userId: string,
  { revokeOnStrava }: { revokeOnStrava: boolean }
): Promise<{ ok: boolean; error?: string }> {
  if (revokeOnStrava) {
    try {
      const connection = await getConnection(userId)
      if (connection) await deauthorize(await getAccessToken(connection))
    } catch (err) {
      console.warn('[strava] deauthorize failed; deleting local data anyway', {
        userId,
        reason: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  const { error: activitiesError } = await adminClient
    .from('strava_activities')
    .delete()
    .eq('user_id', userId)
  if (activitiesError) return { ok: false, error: `strava_activities delete: ${activitiesError.message}` }

  const { error: connectionError } = await adminClient
    .from('strava_connections')
    .delete()
    .eq('user_id', userId)
  if (connectionError) return { ok: false, error: `strava_connections delete: ${connectionError.message}` }

  return { ok: true }
}
