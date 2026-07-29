import LeaderboardClient from './leaderboard-client'
import { getRankedAthletes, toPublicRow, type LeaderboardRow } from '@/lib/leaderboard'

export const metadata = {
  title: 'Leaderboard — Stride Run Club',
}

// Revalidate every 5 minutes so the board stays reasonably fresh
export const revalidate = 300

export type LeaderboardUser = LeaderboardRow

const BOARD_SIZE = 50

export default async function LeaderboardPage() {
  // No cookies anywhere in this route — that's what keeps it ISR. A previous
  // version read cookies via createClient() and silently defeated
  // `revalidate = 300`. The viewer's own position is fetched client-side from
  // /api/leaderboard/me instead, so this stays cacheable for everyone.
  //
  // It also used to select `total_distance_meters` for a second "Distance"
  // board. No such column exists on `users`: PostgREST rejected the query, the
  // data came back null, and the whole board rendered "No athletes yet".
  const ranked = await getRankedAthletes()

  return (
    <LeaderboardClient
      byRuns={ranked.slice(0, BOARD_SIZE).map(toPublicRow)}
      totalAthletes={ranked.length}
    />
  )
}
