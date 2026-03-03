import type { Role } from './auth'

export type UserProfile = {
  id: string
  username: string | null
  full_name: string | null
  bio: string | null
  role: Role
  avatar_url: string | null
  created_at: Date
}
