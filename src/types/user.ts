import type { Role } from './auth'
import type { StravaPBs, StravaActivity } from './strava'

// A textual Q&A prompt shown on the athlete profile. Stored as a JSON array on
// `users.prompts` (max 3, drag-sortable).
export type Prompt = {
  id: string
  question: string
  answer: string
}

// A user-entered race result. Stored as a JSON array on `users.official_runs`
// (no dedicated table).
export type OfficialRun = {
  id: string
  name: string
  time: string | null      // free-form, e.g. "1:55:30"
  distance: string | null  // free-form, e.g. "10K", "Half Marathon"
  month: number | null     // 1–12
  year: number | null      // e.g. 2025
}

export type UserProfile = {
  id: string
  username: string | null
  full_name: string | null
  bio: string | null
  role: Role
  avatar_url: string | null
  /** When false, the profile page is owner/admin-only and leaderboard entries
      are not linked (DPDP consent). Defaults to true. */
  profile_public: boolean
  created_at: Date
  cover_url: string | null
  location: string | null
  skills: string[]
  linkedin_url: string | null
  instagram_url: string | null
  strava_url: string | null
  x_url: string | null
  prompts: Prompt[]
  runs_completed: number
  runner_tag: string | null
  strava_connected: boolean
  strava_pbs: StravaPBs
  strava_recent_activities: StravaActivity[]
  strava_synced_at: string | null
}
