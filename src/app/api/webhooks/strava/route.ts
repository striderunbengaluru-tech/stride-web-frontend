import { NextResponse, after } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { getConnectionByAthlete } from '@/lib/strava/connection'
import { syncAthlete } from '@/lib/strava/sync'

// Strava push subscription (one per app, registered against production — see
// supabase-migrations/2026-09-23-strava-integration.sql and the PR notes).
//
// Strava does NOT sign these events, so a POST here proves nothing. It's used
// only as a hint for *which* athlete to re-read: the sync then fetches
// everything from Strava with our own stored token and ignores the payload.
// A forged "deauthorised" event therefore deletes nothing unless Strava itself
// rejects our refresh token, and syncAthlete's debounce stops a flood of
// forged events from burning the API rate limit.

export const dynamic = 'force-dynamic'

const eventSchema = z.object({
  object_type: z.enum(['activity', 'athlete']),
  aspect_type: z.enum(['create', 'update', 'delete']),
  owner_id: z.number().int().positive(),
})

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** Subscription handshake: echo the challenge only for our own verify token. */
export async function GET(request: Request) {
  const expected = process.env.STRIDE_STRAVA_WEBHOOK_VERIFY_TOKEN
  if (!expected) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token') ?? ''
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || !challenge || !safeEqual(token, expected)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ 'hub.challenge': challenge })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event' }, { status: 400 })

  const connection = await getConnectionByAthlete(parsed.data.owner_id).catch((err: unknown) => {
    console.error('[strava-webhook] connection lookup failed', {
      reason: err instanceof Error ? err.message : 'unknown',
    })
    return null
  })

  // Strava expects a 200 within 2 seconds and retries otherwise, so the sync
  // runs after the response. Unknown athletes are acknowledged and ignored.
  if (connection) {
    after(async () => {
      await syncAthlete(connection.user_id)
    })
  }
  return NextResponse.json({ ok: true })
}
