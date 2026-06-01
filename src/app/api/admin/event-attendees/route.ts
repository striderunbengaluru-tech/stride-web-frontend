import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

// Returns the CONFIRMED attendees of an event so the admin check-in screen can
// search/select by name. Admin-only — gated identically to the rest of the
// admin surface (session + fresh DB role lookup).

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

  const { data, error } = await adminClient
    .from('event_registrations')
    .select('id, status, checked_in_at, users(id, full_name, email, avatar_url, runner_tag)')
    .eq('event_id', eventId)
    .eq('status', 'CONFIRMED')
    .order('checked_in_at', { ascending: false, nullsFirst: true })

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

  return NextResponse.json({ attendees })
}
