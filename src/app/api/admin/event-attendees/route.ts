import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

// Returns the CONFIRMED attendees of an event so the admin check-in screen can
// search/select by name. Admin-only — gated identically to the rest of the
// admin surface (session + fresh DB role lookup).
//
// `?since=<ISO>` returns only the rows checked in after that instant. The check-in
// screen polls with it every few seconds so several admins working the same run
// see each other's check-ins almost immediately without re-downloading the whole
// list. A delta is complete for check-ins because `checked_in_at` only ever goes
// null → set (the claim in lib/check-in.ts never clears it) — but it cannot
// surface someone who REGISTERS mid-event, which is why the client also does a
// periodic full resync.

// Never cached: a stale attendee list is the exact failure this endpoint exists
// to prevent.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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

  const url = new URL(request.url)
  const eventId = url.searchParams.get('eventId')
  if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 })

  // A malformed `since` must not be sent to Postgres as a timestamp predicate —
  // fall back to a full list, which is always correct, just larger.
  const sinceRaw = url.searchParams.get('since')
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? sinceRaw : null

  // Stamped before the query so a check-in committed mid-read is picked up by the
  // NEXT delta rather than falling into the gap between the two.
  const serverTime = new Date().toISOString()

  const query = adminClient
    .from('event_registrations')
    .select('id, status, checked_in_at, users(id, full_name, email, avatar_url, runner_tag)')
    .eq('event_id', eventId)
    .eq('status', 'CONFIRMED')
    .order('checked_in_at', { ascending: false, nullsFirst: true })

  if (since) query.gt('checked_in_at', since)

  const { data, error } = await query

  if (error) {
    console.error('[event-attendees]', error)
    return NextResponse.json({ error: 'Failed to load attendees' }, { status: 500 })
  }

  type Row = {
    id: string
    status: string
    checked_in_at: string | null
    users: { id: string; full_name: string | null; email: string | null; avatar_url: string | null; runner_tag: string | null } | null
  }

  const attendees = (data as unknown as Row[]).map(r => ({
    registrationId: r.id,
    userId: r.users?.id ?? null,
    fullName: r.users?.full_name ?? null,
    email: r.users?.email ?? null,
    avatarUrl: r.users?.avatar_url ?? null,
    runnerTag: r.users?.runner_tag ?? null,
    checkedInAt: r.checked_in_at,
  }))

  return NextResponse.json(
    { attendees, serverTime, mode: since ? 'delta' : 'full' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
