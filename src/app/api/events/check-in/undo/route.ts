import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

// Reverses a check-in made by mistake (wrong runner tapped, duplicate tag, a
// runner who never actually turned up). Mirrors the check-in route exactly:
// admin-only, same 24h window, and it gives back the run it credited.
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

  const body = await request.json().catch(() => ({}))
  const registrationId: string = typeof body.registration_id === 'string' ? body.registration_id.trim() : ''

  if (!registrationId) {
    return NextResponse.json({ error: 'Registration ID required' }, { status: 400 })
  }

  const { data: registration } = await adminClient
    .from('event_registrations')
    .select('id, user_id, event_id, checked_in_at')
    .eq('id', registrationId)
    .maybeSingle()

  if (!registration) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  }

  if (!registration.checked_in_at) {
    return NextResponse.json({ error: 'This runner is not checked in' }, { status: 409 })
  }

  const [{ data: event }, { data: runner }] = await Promise.all([
    adminClient
      .from('events')
      .select('name, status, event_date, end_date, is_test_event')
      .eq('id', registration.event_id)
      .single(),
    adminClient
      .from('users')
      .select('id, full_name, runs_completed')
      .eq('id', registration.user_id)
      .single(),
  ])

  if (!event || event.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Same window as check-in. Past that point the run is history and the
  // leaderboard has long since settled — a correction there is a data fix, not a
  // desk operation.
  const endTs = event.end_date ?? event.event_date
  if (endTs) {
    const closesAt = new Date(endTs).getTime() + 24 * 60 * 60 * 1000
    if (Date.now() > closesAt) {
      return NextResponse.json({ error: 'Check-in window has closed for this event' }, { status: 409 })
    }
  }

  // Atomic release, the mirror of the atomic claim in lib/check-in.ts: only the
  // request that flips checked_in_at from set → NULL wins, so two admins tapping
  // undo on the same runner can never decrement runs_completed twice.
  const { data: released, error: updateError } = await adminClient
    .from('event_registrations')
    .update({ checked_in_at: null })
    .eq('id', registration.id)
    .not('checked_in_at', 'is', null)
    .select('id')

  if (updateError) {
    console.error('[Check-in undo] update error', updateError)
    return NextResponse.json({ error: 'Undo failed' }, { status: 500 })
  }

  if (!released || released.length === 0) {
    return NextResponse.json({ error: 'This runner is not checked in' }, { status: 409 })
  }

  // A test-event check-in never credited a run, so undoing it must not take one
  // away. Floored at 0 because runs_completed is also edited by hand elsewhere
  // and must never go negative.
  const isTestEvent = event.is_test_event === true
  const previousRuns = runner?.runs_completed ?? 0
  const runsCompleted = isTestEvent ? previousRuns : Math.max(0, previousRuns - 1)

  if (!isTestEvent && runsCompleted !== previousRuns) {
    await adminClient
      .from('users')
      .update({ runs_completed: runsCompleted })
      .eq('id', registration.user_id)
  }

  return NextResponse.json({
    success: true,
    registrationId: registration.id,
    attendeeName: runner?.full_name ?? 'Runner',
    eventName: event.name ?? '',
    runsCompleted,
  })
}
