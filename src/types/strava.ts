export type StravaPB = {
  time: number // seconds
  date: string // ISO string
  activityId: number
} | null

export type StravaPBs = {
  mile: StravaPB
  '5k': StravaPB
  '10k': StravaPB
  half: StravaPB
  full: StravaPB
}

export type StravaActivity = {
  id: number
  name: string
  distance: number // meters
  moving_time: number // seconds
  elapsed_time: number // seconds
  start_date: string // ISO string
  type: string
  sport_type: string
  average_speed: number // m/s
  average_heartrate?: number
  pr_count?: number
}

export type OfficialRun = {
  id: string
  user_id: string
  race_name: string
  distance_category: string | null
  race_date: string | null
  finish_time: string | null
  strava_activity_url: string | null
  is_upcoming: boolean
  created_at: string
}
