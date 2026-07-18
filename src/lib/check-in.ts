import { adminClient } from '@/lib/supabase/admin'

// Shared check-in core, used by the admin check-in page when opened from a
// wallet-pass QR URL (?reg=...). Mirrors the rules of the runner-tag API
// route: PUBLISHED event, check-in window open until 24h after the event
// ends, CONFIRMED registration, idempotent on repeat scans.
// Callers MUST verify the caller is an admin before invoking — this mutates.

const CHECK_IN_GRACE_MS = 24 * 60 * 60 * 1000

export type CheckInResult =
  | { ok: true; attendeeName: string; eventName: string; runsCompleted: number; checkedInAt: string }
  | { ok: false; code: 'not-found' | 'not-confirmed' | 'window-closed' | 'already' | 'failed'; message: string; attendeeName?: string; eventName?: string; checkedInAt?: string }

export async function checkInByRegistrationId(registrationId: string): Promise<CheckInResult> {
  const { data: registration } = await adminClient
    .from('event_registrations')
    .select('id, user_id, event_id, status, checked_in_at')
    .eq('id', registrationId)
    .maybeSingle()

  if (!registration) {
    return { ok: false, code: 'not-found', message: 'No registration found for this pass.' }
  }

  const [{ data: event }, { data: runner }] = await Promise.all([
    adminClient
      .from('events')
      .select('name, status, event_date, end_date')
      .eq('id', registration.event_id)
      .single(),
    adminClient
      .from('users')
      .select('id, full_name, runs_completed')
      .eq('id', registration.user_id)
      .single(),
  ])

  const attendeeName = runner?.full_name ?? 'Runner'
  const eventName = event?.name ?? ''

  if (!event || event.status !== 'PUBLISHED') {
    return { ok: false, code: 'not-found', message: 'Event not found or unpublished.', attendeeName, eventName }
  }

  const endTs = event.end_date ?? event.event_date
  if (endTs && Date.now() > new Date(endTs).getTime() + CHECK_IN_GRACE_MS) {
    return { ok: false, code: 'window-closed', message: 'Check-in window has closed for this event.', attendeeName, eventName }
  }

  if (registration.status !== 'CONFIRMED') {
    return { ok: false, code: 'not-confirmed', message: 'Registration is not confirmed.', attendeeName, eventName }
  }

  if (registration.checked_in_at) {
    return {
      ok: false,
      code: 'already',
      message: 'Already checked in.',
      attendeeName,
      eventName,
      checkedInAt: registration.checked_in_at,
    }
  }

  const now = new Date().toISOString()
  const { error: updateError } = await adminClient
    .from('event_registrations')
    .update({ checked_in_at: now })
    .eq('id', registration.id)

  if (updateError) {
    console.error('[Check-in] update error', updateError)
    return { ok: false, code: 'failed', message: 'Check-in failed. Try again.', attendeeName, eventName }
  }

  const runsCompleted = (runner?.runs_completed ?? 0) + 1
  await adminClient
    .from('users')
    .update({ runs_completed: runsCompleted })
    .eq('id', registration.user_id)

  return { ok: true, attendeeName, eventName, runsCompleted, checkedInAt: now }
}
