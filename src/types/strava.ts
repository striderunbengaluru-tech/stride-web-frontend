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
