import { adminClient } from '@/lib/supabase/admin'
import { revalidateLeaderboard } from '@/lib/leaderboard'
import { STRAVA_RECENT_RUNS, STRAVA_RUN_TYPES } from './config'
import {
  StravaError,
  getYtdRunTotals,
  listRecentActivities,
  type StravaSummaryActivity,
} from './client'
import {
  currentIstYear,
  getAccessToken,
  getConnection,
  removeStravaConnection,
  type StravaConnection,
} from './connection'

// Pulls one athlete's current state from Strava — year-to-date run totals and
// their latest public runs — and mirrors it into Postgres. Triggered by the
// OAuth callback, the Strava webhook and the daily reconcile cron.
//
// Every trigger is just a hint to re-read: nothing from a webhook payload is
// ever written. That is what makes the unsigned webhook safe to act on.

/** A webhook burst (or a forged one) can't burn the Strava rate limit. */
const SYNC_DEBOUNCE_MS = 60_000

/** Enough history to find 5 public runs among rides, walks and private runs. */
const ACTIVITY_LOOKBACK = 30

export type SyncOutcome = 'synced' | 'skipped' | 'not_connected' | 'revoked' | 'failed'

function isPublicRun(activity: StravaSummaryActivity): boolean {
  const visibility = activity.visibility ?? 'everyone'
  return STRAVA_RUN_TYPES.includes(activity.sport_type)
    && visibility === 'everyone'
    && activity.private !== true
}

/** Calls `fn` with a live token; on a 401, refreshes once and retries. */
async function withAccessToken<T>(
  connection: StravaConnection,
  fn: (accessToken: string) => Promise<T>
): Promise<T> {
  try {
    return await fn(await getAccessToken(connection))
  } catch (err) {
    if (!(err instanceof StravaError) || err.kind !== 'unauthorized') throw err
    // A refresh that Strava rejects throws 'revoked' — the real signal.
    return fn(await getAccessToken(connection, { forceRefresh: true }))
  }
}

async function replaceActivities(userId: string, runs: StravaSummaryActivity[]): Promise<void> {
  if (runs.length > 0) {
    const { error } = await adminClient.from('strava_activities').upsert(
      runs.map(run => ({
        id: run.id,
        user_id: userId,
        name: run.name,
        sport_type: run.sport_type,
        start_date: run.start_date,
        utc_offset_s: Math.round(run.utc_offset),
        distance_m: Math.round(run.distance),
        moving_time_s: run.moving_time,
        elapsed_time_s: run.elapsed_time,
        elevation_gain_m: run.total_elevation_gain,
        summary_polyline: run.map?.summary_polyline || null,
        synced_at: new Date().toISOString(),
      })),
      { onConflict: 'id' }
    )
    if (error) throw new Error(`strava_activities upsert failed: ${error.message}`)
  }

  // Keep exactly the latest runs: anything else (older, since made private,
  // deleted on Strava) goes. Ids are Zod-validated integers, safe to inline.
  let stale = adminClient.from('strava_activities').delete().eq('user_id', userId)
  if (runs.length > 0) stale = stale.not('id', 'in', `(${runs.map(run => run.id).join(',')})`)
  const { error } = await stale
  if (error) throw new Error(`strava_activities prune failed: ${error.message}`)
}

export async function syncAthlete(
  userId: string,
  { force = false }: { force?: boolean } = {}
): Promise<SyncOutcome> {
  const connection = await getConnection(userId)
  if (!connection) return 'not_connected'

  const lastSynced = connection.last_synced_at ? new Date(connection.last_synced_at).getTime() : 0
  if (!force && Date.now() - lastSynced < SYNC_DEBOUNCE_MS) return 'skipped'

  try {
    const [ytd, activities] = await withAccessToken(connection, accessToken =>
      Promise.all([
        getYtdRunTotals(connection.athlete_id, accessToken),
        listRecentActivities(accessToken, ACTIVITY_LOOKBACK),
      ])
    )

    const runs = activities.filter(isPublicRun).slice(0, STRAVA_RECENT_RUNS)
    await replaceActivities(userId, runs)

    const year = currentIstYear()
    const { error } = await adminClient
      .from('strava_connections')
      .update({
        ytd_run_distance_m: ytd.distanceM,
        ytd_run_count: ytd.count,
        ytd_year: year,
        last_synced_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
    if (error) throw new Error(`strava_connections update failed: ${error.message}`)

    // Only purge the board when a number on it actually moved.
    if (ytd.distanceM !== connection.ytd_run_distance_m || year !== connection.ytd_year) {
      revalidateLeaderboard()
    }
    return 'synced'
  } catch (err) {
    if (err instanceof StravaError && err.kind === 'revoked') {
      // The athlete removed Stride on Strava: their data has to go.
      const removal = await removeStravaConnection(userId, { revokeOnStrava: false })
      if (!removal.ok) console.error('[strava] cleanup after revocation failed', { userId, error: removal.error })
      revalidateLeaderboard()
      return 'revoked'
    }
    console.error('[strava] sync failed', {
      userId,
      kind: err instanceof StravaError ? err.kind : 'unexpected',
      reason: err instanceof Error ? err.message : 'unknown',
    })
    return 'failed'
  }
}
