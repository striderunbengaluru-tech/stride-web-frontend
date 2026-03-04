import { createClient } from '@/lib/supabase/server'
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
}

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const { data: byRuns } = await supabase
    .from('users')
    .select('username, full_name, avatar_url, runs_completed, total_distance_meters')
    .order('runs_completed', { ascending: false })
    .limit(50)

  const { data: byDistance } = await supabase
    .from('users')
    .select('username, full_name, avatar_url, runs_completed, total_distance_meters')
    .order('total_distance_meters', { ascending: false })
    .limit(50)

  return (
    <LeaderboardClient
      byRuns={(byRuns ?? []) as LeaderboardUser[]}
      byDistance={(byDistance ?? []) as LeaderboardUser[]}
    />
  )
}
