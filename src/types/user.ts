import type { Role } from './auth'
import type { StravaPBs, StravaActivity } from './strava'

export type Prompt = {
  question: string
  answer: string
}

export type GalleryImage = {
  url: string
  caption?: string
}

export type PromptImage = {
  prompt: string
  url: string
}

// A user-entered race result. Stored as a JSON array on `users.official_runs`
// (no dedicated table — mirrors the `prompt_images` pattern).
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
  created_at: Date
  cover_url: string | null
  location: string | null
  skills: string[]
  linkedin_url: string | null
  instagram_url: string | null
  strava_url: string | null
  x_url: string | null
  prompts: Prompt[]
  gallery_images: GalleryImage[]
  prompt_images: PromptImage[]
  runs_completed: number
  runner_tag: string | null
  strava_connected: boolean
  strava_pbs: StravaPBs
  strava_recent_activities: StravaActivity[]
  strava_synced_at: string | null
}
