import type { Role } from './auth'

export type Prompt = {
  question: string
  answer: string
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
  prompts: Prompt[]
  runs_completed: number
}
