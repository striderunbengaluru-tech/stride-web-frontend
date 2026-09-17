import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { isPortalRole } from '@/types/auth'

// Returns the CONFIRMED attendees of an event so the check-in screen can
// search/select by name.
//
// ADMIN or LEAD, mirroring ../route.ts and ../undo/route.ts: the attendee list
// IS the check-in screen — without it a lead sees an empty roster and cannot
// check anyone in. That is why this lives under /api/events/check-in/ and not
// /api/admin/: nothing under /api/admin/* may ever admit a LEAD (see
// types/auth.ts), and this route is a check-in dependency, not an admin one.
// Gated identically to its siblings: session + fresh DB role lookup.
//
// `?since=<ISO>` returns only the rows checked in after that instant. The check-in
// screen polls with it every few seconds so several admins working the same run
// see each other's check-ins almost immediately without re-downloading the whole
// list. A delta only ever carries check-ins: it cannot surface someone who
// REGISTERS mid-event, nor an UNDONE check-in (the row's checked_in_at goes back
// to NULL and so falls out of the predicate). Both are picked up by the client's
// periodic full resync instead.

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
  if (!isPortalRole(adminUser?.role)) {
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
    console.error('[check-in/attendees]', error)
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
