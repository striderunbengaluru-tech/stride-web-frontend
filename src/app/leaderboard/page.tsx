import { adminClient } from '@/lib/supabase/admin'
import LeaderboardClient from './leaderboard-client'

export const metadata = {
  title: 'Leaderboard — Stride Run Club',
}

// Revalidate every 5 minutes so the board stays reasonably fresh
export const revalidate = 300

export type LeaderboardUser = {
  username: string
  full_name: string | null
  avatar_url: string | null
  runs_completed: number
  total_distance_meters: number
  /** When false the entry shows name + photo only, with no profile link. */
  profile_public: boolean
}

export default async function LeaderboardPage() {
  // adminClient (no cookies) keeps this route ISR — the old createClient()
  // read cookies and silently defeated `revalidate = 300`. Public columns
  // only; the two independent queries run in parallel.
  const [{ data: byRuns }, { data: byDistance }] = await Promise.all([
    adminClient
      .from('users')
      .select('username, full_name, avatar_url, profile_public, runs_completed, total_distance_meters')
      .order('runs_completed', { ascending: false })
      .limit(50),
    adminClient
      .from('users')
      .select('username, full_name, avatar_url, profile_public, runs_completed, total_distance_meters')
      .order('total_distance_meters', { ascending: false })
      .limit(50),
  ])

  return (
    <LeaderboardClient
      byRuns={(byRuns ?? []) as LeaderboardUser[]}
      byDistance={(byDistance ?? []) as LeaderboardUser[]}
    />
  )
}
