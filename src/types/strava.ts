/** One synced run, as stored in `strava_activities` and shown on the profile. */
export type StravaActivitySummary = {
  id: number
  name: string
  sportType: string
  /** UTC ISO timestamp. */
  startDate: string
  /** Seconds east of UTC where the run started — gives its local start time. */
  utcOffsetS: number
  distanceM: number
  movingTimeS: number
  elapsedTimeS: number
  elevationGainM: number
  /** Google-encoded polyline; null for treadmill / indoor runs. */
  summaryPolyline: string | null
}

/** Everything the profile needs about one athlete's Strava link. */
export type StravaProfile =
  | { connected: false }
  | {
      connected: true
      ytdDistanceM: number
      ytdRunCount: number
      lastSyncedAt: string | null
      activities: StravaActivitySummary[]
    }
