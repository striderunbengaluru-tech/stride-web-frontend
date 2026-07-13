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

type LeaderboardRow = LeaderboardUser & { avatar_public: boolean }

// DPDP visibility consent: the leaderboard is a public surface, so strip the
// photo URL server-side for athletes who set their photo to private. The
// avatar_public flag itself never reaches the client.
function stripPrivateAvatars(rows: LeaderboardRow[] | null): LeaderboardUser[] {
  return (rows ?? []).map(({ avatar_public, ...user }) => ({
    ...user,
    avatar_url: avatar_public ? user.avatar_url : null,
  }))
}

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const { data: byRuns } = await supabase
    .from('users')
    .select('username, full_name, avatar_url, avatar_public, runs_completed, total_distance_meters')
    .order('runs_completed', { ascending: false })
    .limit(50)

  const { data: byDistance } = await supabase
    .from('users')
    .select('username, full_name, avatar_url, avatar_public, runs_completed, total_distance_meters')
    .order('total_distance_meters', { ascending: false })
    .limit(50)

  return (
    <LeaderboardClient
      byRuns={stripPrivateAvatars(byRuns as LeaderboardRow[] | null)}
      byDistance={stripPrivateAvatars(byDistance as LeaderboardRow[] | null)}
    />
  )
}
