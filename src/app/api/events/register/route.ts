import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { registerEventSchema } from '@/lib/validations/events'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = registerEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { eventId } = parsed.data

  // Fetch the event
  const { data: event } = await adminClient
    .from('events')
    .select('id, name, slug, status, price_paise, capacity')
    .eq('id', eventId)
    .single()

  if (!event || event.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Check for duplicate registration
  const { data: existing } = await adminClient
    .from('event_registrations')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already registered' }, { status: 409 })
  }

  // Check capacity
  if (event.capacity) {
    const { count: confirmedCount } = await adminClient
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'CONFIRMED')

    if ((confirmedCount ?? 0) >= event.capacity) {
      return NextResponse.json({ error: 'Event is full' }, { status: 409 })
    }
  }

  // Confirm immediately — Cashfree payment integration is pending credentials.
  // All registrations (free and paid) are confirmed at booking time for now.
  const registrationId = nanoid()
  await adminClient.from('event_registrations').insert({
    id: registrationId,
    event_id: eventId,
    user_id: user.id,
    status: 'CONFIRMED',
  })

  return NextResponse.json({ registrationId, slug: event.slug })
}
