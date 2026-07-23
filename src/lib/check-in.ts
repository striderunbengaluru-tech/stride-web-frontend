import { adminClient } from '@/lib/supabase/admin'

// Shared check-in core, used by the admin check-in page when opened from a
// wallet-pass QR URL (?reg=...). Mirrors the rules of the runner-tag API
// route: PUBLISHED event, check-in window open until 24h after the event
// ends, CONFIRMED registration, idempotent on repeat scans.
// Callers MUST verify the caller is an admin before invoking — this mutates.

const CHECK_IN_GRACE_MS = 24 * 60 * 60 * 1000
// A single scan reaches this GET more than once (RSC prefetch + the real
// navigation, a reload, or the camera→browser handoff). Within this window a
// repeat is treated as the SAME scan and shown as success, not the "already
// checked in" warning — that warning is reserved for a genuine later re-scan.
const CHECK_IN_DEDUP_MS = 2 * 60 * 1000

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

  // Atomic check-in: only the request that flips checked_in_at from NULL wins,
  // so runs_completed can never be double-counted by concurrent/duplicate GETs.
  const now = new Date().toISOString()
  const { data: claimed, error: updateError } = await adminClient
    .from('event_registrations')
    .update({ checked_in_at: now })
    .eq('id', registration.id)
    .is('checked_in_at', null)
    .select('id')

  if (updateError) {
    console.error('[Check-in] update error', updateError)
    return { ok: false, code: 'failed', message: 'Check-in failed. Try again.', attendeeName, eventName }
  }

  // No row claimed → this pass was already checked in. If that happened just
  // now (a duplicate fire of the same scan) show success; only a genuine later
  // re-scan gets the "already checked in" warning.
  if (!claimed || claimed.length === 0) {
    const { data: current } = await adminClient
      .from('event_registrations')
      .select('checked_in_at')
      .eq('id', registration.id)
      .maybeSingle()
    const checkedInAt = current?.checked_in_at ?? now
    const isRecent = Date.now() - new Date(checkedInAt).getTime() < CHECK_IN_DEDUP_MS
    if (isRecent) {
      return { ok: true, attendeeName, eventName, runsCompleted: runner?.runs_completed ?? 0, checkedInAt }
    }
    return { ok: false, code: 'already', message: 'Already checked in.', attendeeName, eventName, checkedInAt }
  }

  const runsCompleted = (runner?.runs_completed ?? 0) + 1
  await adminClient
    .from('users')
    .update({ runs_completed: runsCompleted })
    .eq('id', registration.user_id)

  return { ok: true, attendeeName, eventName, runsCompleted, checkedInAt: now }
}
