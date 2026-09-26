import { cache } from 'react'
import { adminClient } from '@/lib/supabase/admin'
import type { StravaActivitySummary, StravaProfile } from '@/types/strava'
import { STRAVA_ATHLETE_CAP, STRAVA_PUBLIC_DISPLAY, STRAVA_RECENT_RUNS } from './config'
import { currentIstYear } from './connection'

// Read side for pages. Selects display columns only — the encrypted token
// columns are never read here, so they can't end up in a render or a prop.

type ActivityRow = {
  id: number
  name: string
  sport_type: string
  start_date: string
  utc_offset_s: number
  distance_m: number
  moving_time_s: number
  elapsed_time_s: number
  elevation_gain_m: number | string // numeric can serialise as a string
  summary_polyline: string | null
}

function toSummary(row: ActivityRow): StravaActivitySummary {
  return {
    id: row.id,
    name: row.name,
    sportType: row.sport_type,
    startDate: row.start_date,
    utcOffsetS: row.utc_offset_s,
    distanceM: row.distance_m,
    movingTimeS: row.moving_time_s,
    elapsedTimeS: row.elapsed_time_s,
    elevationGainM: Number(row.elevation_gain_m),
    summaryPolyline: row.summary_polyline,
  }
}

type UsernameYtdRow = {
  username: string
  // One-to-one embed (strava_connections.user_id is the PK and an FK to users),
  // so PostgREST returns an object or null rather than an array.
  strava_connections: { ytd_run_distance_m: number; ytd_year: number } | null
}

/**
 * Year-to-date Strava distance (metres) for the given usernames — only those
 * who are connected and have synced this year appear in the map. Returns an
 * empty map when Strava data isn't shown publicly.
 */
export async function getYtdDistanceByUsername(usernames: string[]): Promise<Map<string, number>> {
  const byUsername = new Map<string, number>()
  if (!STRAVA_PUBLIC_DISPLAY || usernames.length === 0) return byUsername

  const { data, error } = await adminClient
    .from('users')
    .select('username, strava_connections(ytd_run_distance_m, ytd_year)')
    .in('username', usernames)
  if (error) {
    console.error('[strava] ytd lookup failed', { error: error.message })
    return byUsername
  }

  const year = currentIstYear()
  for (const row of (data ?? []) as unknown as UsernameYtdRow[]) {
    const connection = row.strava_connections
    if (connection && connection.ytd_year === year) byUsername.set(row.username, connection.ytd_run_distance_m)
  }
  return byUsername
}

export const getStravaProfile = cache(async (userId: string): Promise<StravaProfile> => {
  const [{ data: connection, error: connectionError }, { data: activities, error: activitiesError }] =
    await Promise.all([
      adminClient
        .from('strava_connections')
        .select('ytd_run_distance_m, ytd_run_count, ytd_year, last_synced_at')
        .eq('user_id', userId)
        .maybeSingle(),
      adminClient
        .from('strava_activities')
        .select('id, name, sport_type, start_date, utc_offset_s, distance_m, moving_time_s, elapsed_time_s, elevation_gain_m, summary_polyline')
        .eq('user_id', userId)
        .order('start_date', { ascending: false })
        .limit(STRAVA_RECENT_RUNS),
    ])

  if (connectionError || activitiesError) {
    console.error('[strava] profile read failed', {
      userId,
      error: connectionError?.message ?? activitiesError?.message,
    })
    return { connected: false }
  }
  if (!connection) return { connected: false }

  // Totals from a previous year (no sync since 31 Dec) read as zero, matching
  // the board's rule.
  const isCurrentYear = connection.ytd_year === currentIstYear()
  return {
    connected: true,
    ytdDistanceM: isCurrentYear ? connection.ytd_run_distance_m : 0,
    ytdRunCount: isCurrentYear ? connection.ytd_run_count : 0,
    lastSyncedAt: connection.last_synced_at,
    activities: ((activities ?? []) as ActivityRow[]).map(toSummary),
  }
})

/**
 * Whether the Strava app can take another athlete. Strava rejects new
 * connections past STRAVA_ATHLETE_CAP, so the connect prompt is hidden until a
 * spot frees up or the cap is raised. Fails closed: an unknown count hides it.
 */
export async function hasStravaSpotsLeft(): Promise<boolean> {
  const { count, error } = await adminClient
    .from('strava_connections')
    .select('user_id', { count: 'exact', head: true })
  if (error || count === null) {
    console.error('[strava] connection count failed', { error: error?.message })
    return false
  }
  return count < STRAVA_ATHLETE_CAP
}
