import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const runnerTag: string = (body.runner_tag ?? '').trim().toUpperCase()
  const eventId: string = body.event_id ?? ''

  if (!runnerTag || runnerTag.length !== 4) {
    return NextResponse.json({ error: 'Runner Tag must be exactly 4 characters' }, { status: 400 })
  }
  if (!eventId) {
    return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
  }

  // ── Enforce check-in window: open until 24h after end_date (or event_date if no end_date) ──
  const { data: eventWindow } = await adminClient
    .from('events')
    .select('event_date, end_date, status')
    .eq('id', eventId)
    .single()

  if (!eventWindow || eventWindow.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const endTs = eventWindow.end_date ?? eventWindow.event_date
  if (endTs) {
    const closesAt = new Date(endTs).getTime() + 24 * 60 * 60 * 1000
    if (Date.now() > closesAt) {
      return NextResponse.json({ error: 'Check-in window has closed for this event' }, { status: 409 })
    }
  }

  // Look up the runner by their tag
  const { data: runner } = await adminClient
    .from('users')
    .select('id, full_name, runs_completed')
    .eq('runner_tag', runnerTag)
    .single()

  if (!runner) {
    return NextResponse.json({ error: 'No runner found with this tag' }, { status: 404 })
  }

  // Find their registration for this event
  const { data: registration } = await adminClient
    .from('event_registrations')
    .select('id, status, checked_in_at')
    .eq('user_id', runner.id)
    .eq('event_id', eventId)
    .single()

  if (!registration) {
    return NextResponse.json({ error: 'Runner is not registered for this event' }, { status: 404 })
  }

  if (registration.status !== 'CONFIRMED') {
    return NextResponse.json({ error: 'Registration is not confirmed' }, { status: 400 })
  }

  if (registration.checked_in_at) {
    return NextResponse.json(
      { error: 'Already checked in', checkedInAt: registration.checked_in_at },
      { status: 409 }
    )
  }

  const now = new Date().toISOString()
  const { error: updateError } = await adminClient
    .from('event_registrations')
    .update({ checked_in_at: now })
    .eq('id', registration.id)

  if (updateError) {
    console.error('[Check-in] update error', updateError)
    return NextResponse.json({ error: 'Check-in failed' }, { status: 500 })
  }

  const [{ data: eventData }] = await Promise.all([
    adminClient.from('events').select('name').eq('id', eventId).single(),
  ])

  const newRunsCompleted = (runner.runs_completed ?? 0) + 1
  await adminClient
    .from('users')
    .update({ runs_completed: newRunsCompleted })
    .eq('id', runner.id)

  return NextResponse.json({
    success: true,
    checkedInAt: now,
    attendeeName: runner.full_name ?? 'Runner',
    eventName: eventData?.name ?? '',
    runsCompleted: newRunsCompleted,
  })
}
