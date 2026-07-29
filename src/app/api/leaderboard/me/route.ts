import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRankedAthletes } from '@/lib/leaderboard'

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

  const ranked = await getRankedAthletes()
  const index = ranked.findIndex(r => r.id === user.id)

  if (index === -1) {
    return NextResponse.json({ signedIn: true, rank: null }, { status: 200 })
  }

  const me = ranked[index]!
  return NextResponse.json(
    {
      signedIn: true,
      rank: index + 1,
      total: ranked.length,
      runsCompleted: me.runs_completed,
      username: me.username,
      fullName: me.full_name,
      avatarUrl: me.avatar_url,
    },
    // Per-user data — must never land in a shared cache.
    { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
  )
}
