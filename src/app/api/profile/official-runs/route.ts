import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

const createSchema = z.object({
  raceName: z.string().min(1).max(200),
  distanceCategory: z.string().max(50).optional().or(z.literal('')),
  raceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  finishTime: z.string().max(20).optional().or(z.literal('')),
  stravaActivityUrl: z.string().url().optional().or(z.literal('')),
  isUpcoming: z.boolean(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { raceName, distanceCategory, raceDate, finishTime, stravaActivityUrl, isUpcoming } = parsed.data

  const { data, error } = await adminClient
    .from('official_runs')
    .insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      race_name: raceName,
      distance_category: distanceCategory || null,
      race_date: raceDate || null,
      finish_time: finishTime || null,
      strava_activity_url: stravaActivityUrl || null,
      is_upcoming: isUpcoming,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to save run' }, { status: 500 })
  return NextResponse.json({ run: data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await adminClient
    .from('official_runs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
