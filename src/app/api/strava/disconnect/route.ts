import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clearStravaData } from '@/lib/strava'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await clearStravaData(user.id)
  return NextResponse.json({ ok: true })
}
