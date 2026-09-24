import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getViewerRank, type ViewerStanding } from '@/lib/leaderboard'

// The viewer's own standing on the board. Split out of the leaderboard page so
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

  // One row out of Postgres (plus the viewer's Strava km, if connected).
  const runs = await getViewerRank(user.id)

  return NextResponse.json(
    { signedIn: true, runs } satisfies ViewerStanding,
    // Per-user data — must never land in a shared cache.
    { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
  )
}
