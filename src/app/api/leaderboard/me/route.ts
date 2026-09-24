import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getViewerKmRank, getViewerRank, type ViewerStanding } from '@/lib/leaderboard'
import { isStravaConnected } from '@/lib/strava/data'

// The viewer's own standing on both boards. Split out of the leaderboard page so
// that page can stay ISR (reading cookies there would make the whole route
// dynamic).
//
// Returns only the caller's own aggregate position — never another athlete's
// identity — so there's nothing here a signed-in member can't already see.

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ signedIn: false } satisfies ViewerStanding, { status: 200 })
  }

  // One row per board out of Postgres, in parallel.
  const [runs, km, stravaConnected] = await Promise.all([
    getViewerRank(user.id),
    getViewerKmRank(user.id),
    isStravaConnected(user.id),
  ])

  return NextResponse.json(
    { signedIn: true, runs, km, stravaConnected } satisfies ViewerStanding,
    // Per-user data — must never land in a shared cache.
    { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
  )
}
