import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { adminClient } from '@/lib/supabase/admin'
import { syncAthlete, type SyncOutcome } from '@/lib/strava/sync'

// Daily reconcile for every Strava connection (vercel.json, 02:00 IST). The
// webhook keeps the board fresh during the day; this catches what it can't:
// missed or undelivered events, athletes who revoked access without an event
// reaching us, the 1 January year-to-date reset — and staging, which never
// receives webhooks at all (Strava allows one subscription per app).
//
// Same auth as /api/cron/purge-inactive: Vercel sends
// `Authorization: Bearer <CRON_SECRET>` when the var is named exactly that.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Bounded per run to stay well inside maxDuration and the Strava rate limit. */
const MAX_SYNCS_PER_RUN = 50

function isAuthorised(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header ?? '')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[strava-sync] CRON_SECRET is not configured — refusing to run')
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
  }
  if (!isAuthorised(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Least recently synced first, so a capped run always makes progress.
  const { data, error } = await adminClient
    .from('strava_connections')
    .select('user_id')
    .order('last_synced_at', { ascending: true, nullsFirst: true })
    .limit(MAX_SYNCS_PER_RUN)
  if (error) {
    console.error('[strava-sync] failed to list connections', { error: error.message })
    return NextResponse.json({ error: 'Failed to list connections' }, { status: 500 })
  }

  const tally: Record<SyncOutcome, number> = { synced: 0, skipped: 0, not_connected: 0, revoked: 0, failed: 0 }
  // Sequential on purpose: a handful of athletes, and it keeps the request
  // rate to Strava gentle.
  for (const { user_id } of data ?? []) {
    tally[await syncAthlete(user_id)] += 1
  }

  return NextResponse.json({ ok: true, ...tally })
}
