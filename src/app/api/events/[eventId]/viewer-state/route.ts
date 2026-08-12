import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

/**
 * Where the calling viewer stands with one event.
 *
 * Split out of the event page for the same reason `/api/leaderboard/me` was
 * split out of the leaderboard: the Register panel needed the session, reading
 * the session in a server component made the whole `/events/[slug]` route
 * dynamic, and so every anonymous visitor — every Instagram click, every
 * crawler — paid for a full personalised rebuild of a page that is identical
 * for all of them. The page is now ISR and this is the only per-viewer piece.
 *
 * Returns only the caller's own registration and their own profile prefill.
 * There is nothing here a signed-in member cannot already see about
 * themselves, and no way to ask about anybody else — every query is keyed on
 * the id from the verified session, never on anything in the request.
 */

// Belt-and-braces: the Supabase client parameterizes these anyway, but an
// unbounded path segment should never reach a query builder unchecked.
const EventIdSchema = z.string().min(1).max(128)

const EMPTY_INITIAL = {
  fullName: null as string | null,
  dateOfBirth: null as string | null,
  gender: null as string | null,
  contactNumber: null as string | null,
  emergencyContactNumber: null as string | null,
}

/** Per-user data — must never land in a shared cache. */
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' } as const

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ eventId: string }> },
) {
  const { eventId: rawEventId } = await ctx.params
  const parsed = EventIdSchema.safeParse(rawEventId)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid event.' }, { status: 400, headers: PRIVATE_HEADERS })
  }
  const eventId = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Anonymous is a valid answer, not an error: most visitors to an event page
  // are signed out, and the panel renders a "sign in to register" state.
  if (!user) {
    return NextResponse.json(
      { isLoggedIn: false, viewerState: 'none', registrationId: null, initial: EMPTY_INITIAL },
      { status: 200, headers: PRIVATE_HEADERS },
    )
  }

  const [{ data: reg }, { data: profile }] = await Promise.all([
    adminClient
      .from('event_registrations')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle(),
    adminClient
      .from('users')
      .select('full_name, date_of_birth, gender, contact_number, emergency_contact_number')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  // Fall back to Google OAuth metadata if users.full_name is empty
  const oauthName = (user.user_metadata?.full_name as string | undefined)
    ?? (user.user_metadata?.name as string | undefined)
    ?? null
  const initial = profile
    ? {
        fullName: profile.full_name ?? oauthName,
        dateOfBirth: profile.date_of_birth ?? null,
        gender: profile.gender ?? null,
        contactNumber: profile.contact_number ?? null,
        emergencyContactNumber: profile.emergency_contact_number ?? null,
      }
    : { ...EMPTY_INITIAL, fullName: oauthName }

  // Four viewer states rather than a boolean: an invite-only applicant is
  // neither "registered" nor free to register again, and a rejected runner may
  // still buy a ticket once the mode is switched off.
  const status = reg?.status ?? null
  const viewerState =
    status === 'CONFIRMED' ? 'confirmed'
    : status === 'APPLIED' ? 'applied'
    : status === 'REJECTED' ? 'rejected'
    : 'none'

  // Surfaced for CONFIRMED and APPLIED — the two states the confirmation page
  // renders (it re-checks session, ownership and status itself). A REJECTED
  // runner is sent to the event page instead, where they can register if the
  // event is now open.
  const hasReceipt = viewerState === 'confirmed' || viewerState === 'applied'

  return NextResponse.json(
    {
      isLoggedIn: true,
      viewerState,
      registrationId: hasReceipt ? reg!.id : null,
      initial,
    },
    { status: 200, headers: PRIVATE_HEADERS },
  )
}
