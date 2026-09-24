import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { removeStravaConnection } from '@/lib/strava/connection'
import { revalidateLeaderboard } from '@/lib/leaderboard'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await removeStravaConnection(user.id, { revokeOnStrava: true })
  if (!result.ok) {
    console.error('[strava] disconnect failed', { userId: user.id, error: result.error })
    return NextResponse.json({ error: 'Could not disconnect Strava. Please try again.' }, { status: 500 })
  }

  revalidateLeaderboard()
  return NextResponse.json({ ok: true })
}
