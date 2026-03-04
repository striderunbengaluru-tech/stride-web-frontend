import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { verifyQrToken } from '@/lib/qr-token'

export async function POST(request: Request) {
  // Admin-only endpoint
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

  const { token } = await request.json()
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const payload = verifyQrToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or tampered QR code' }, { status: 400 })
  }

  // Fetch the registration
  const { data: registration } = await adminClient
    .from('event_registrations')
    .select('id, user_id, event_id, status, checked_in_at')
    .eq('id', payload.registrationId)
    .single()

  if (!registration) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  }

  // Cross-check payload fields against DB (prevent token reuse for different registrations)
  if (registration.event_id !== payload.eventId || registration.user_id !== payload.userId) {
    return NextResponse.json({ error: 'Token mismatch' }, { status: 400 })
  }

  if (registration.status !== 'CONFIRMED') {
    return NextResponse.json({ error: 'Registration is not confirmed' }, { status: 400 })
  }

  if (registration.checked_in_at) {
    return NextResponse.json({ error: 'Already checked in', checkedInAt: registration.checked_in_at }, { status: 409 })
  }

  // Mark as checked in
  const now = new Date().toISOString()
  const { error: updateError } = await adminClient
    .from('event_registrations')
    .update({ checked_in_at: now })
    .eq('id', registration.id)

  if (updateError) {
    console.error('[Check-in] update registration error', updateError)
    return NextResponse.json({ error: 'Check-in failed' }, { status: 500 })
  }

  // Increment runs_completed on user and fetch profile + event name
  const [{ data: userData }, { data: eventData }] = await Promise.all([
    adminClient.from('users').select('full_name, runs_completed').eq('id', registration.user_id).single(),
    adminClient.from('events').select('name').eq('id', registration.event_id).single(),
  ])

  const newRunsCompleted = (userData?.runs_completed ?? 0) + 1
  await adminClient
    .from('users')
    .update({ runs_completed: newRunsCompleted })
    .eq('id', registration.user_id)

  return NextResponse.json({
    success: true,
    checkedInAt: now,
    attendeeName: userData?.full_name ?? 'Attendee',
    eventName: eventData?.name ?? '',
    runsCompleted: newRunsCompleted,
  })
}
