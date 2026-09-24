import { cache } from 'react'
import { adminClient } from '@/lib/supabase/admin'
import type { StravaActivitySummary, StravaProfile } from '@/types/strava'
import { STRAVA_RECENT_RUNS } from './config'
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

export async function isStravaConnected(userId: string): Promise<boolean> {
  const { data, error } = await adminClient
    .from('strava_connections')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) console.error('[strava] connection check failed', { userId, error: error.message })
  return Boolean(data)
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
