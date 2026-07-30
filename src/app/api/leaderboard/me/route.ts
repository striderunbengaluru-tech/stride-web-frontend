import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getViewerRank } from '@/lib/leaderboard'

// The viewer's own standing. Split out of the leaderboard page so that page can
// stay ISR (reading cookies there would make the whole route dynamic).
//
// Returns only the caller's own aggregate position — never another athlete's
// identity — so there's nothing here a signed-in member can't already see.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ signedIn: false }, { status: 200 })
  }

  // One row out of Postgres. This used to pull the entire ranking and findIndex()
  // through it, which meant every signed-in visitor to the board paid for a full
  // scan of two tables to learn a single number.
  const me = await getViewerRank(user.id)

  if (!me) {
    return NextResponse.json({ signedIn: true, rank: null }, { status: 200 })
  }

  return NextResponse.json(
    {
      signedIn: true,
      rank: me.rank,
      total: me.totalAthletes,
      runsCompleted: me.runsCompleted,
      username: me.username,
      fullName: me.fullName,
      avatarUrl: me.avatarUrl,
    },
    // Per-user data — must never land in a shared cache.
    { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
  )
}
