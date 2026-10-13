import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { UNSUBSCRIBE_TOKEN_LENGTH, verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token'
import { getRequestOrigin } from '@/lib/site-url'
import { checkRateLimit, READ_LIMIT, tooManyRequests } from '@/lib/rate-limit'

// Marketing-email unsubscribe. One URL serves both the footer link in every
// promo email and the `List-Unsubscribe` header (see unsubscribeUrl() in
// @/lib/email/unsubscribe-token):
//
//   GET  → never unsubscribes. Redirects to the /unsubscribe confirmation page,
//          which shows a button that POSTs back here. Link scanners (Outlook
//          Safe Links, corporate gateways, Gmail's own prefetch) GET every URL
//          in a message, so a GET that acted would unsubscribe people who never
//          clicked anything — RFC 8058 exists precisely because of this.
//   POST → unsubscribes. Either RFC 8058 one-click from the mail client
//          (body `List-Unsubscribe=One-Click`, answered with a plain 200 — the
//          RFC forbids redirecting it) or the confirmation page's form
//          (`from=page`, answered with a 303 to the "done" state).
//
// AUTH: there is no session here and there can't be — a one-click POST comes
// from Gmail's servers, not the member's browser. The HMAC token IS the auth.
// So it is verified before anything else, and adminClient (which bypasses RLS)
// is touched only after it passes, and then only to clear this one user's
// marketing flag. A valid token grants nothing more than that.
//
// Idempotent: unsubscribing twice, or unsubscribing an id whose row has since
// been deleted, is a success — there is nothing left to send to either way.

const QuerySchema = z.object({
  u: z.string().min(1).max(128),
  t: z.string().regex(new RegExp(`^[0-9a-f]{${UNSUBSCRIBE_TOKEN_LENGTH}}$`)),
})

const INVALID_LINK_MESSAGE =
  "This unsubscribe link isn't valid. Please use the link in your most recent Stride email, or contact us at strideclub.in/contact-us and we'll take you off the list."

const NO_STORE = { 'Cache-Control': 'private, no-store' } as const

function invalidLink(): NextResponse {
  return new NextResponse(INVALID_LINK_MESSAGE, {
    status: 400,
    headers: { ...NO_STORE, 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

/** The verified user id, or null for a missing, malformed or forged link. */
function verifiedUserId(request: Request): string | null {
  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({ u: searchParams.get('u'), t: searchParams.get('t') })
  if (!parsed.success) return null
  return verifyUnsubscribeToken(parsed.data.u, parsed.data.t) ? parsed.data.u : null
}

export async function GET(request: Request) {
  // Rate-limited because it's the path a browser (or a script) can hammer. The
  // token is unguessable either way; this just keeps a loop off the instance.
  const rate = checkRateLimit(request, READ_LIMIT)
  if (!rate.ok) return tooManyRequests(rate, `${getRequestOrigin(request)}/contact-us`)

  const userId = verifiedUserId(request)
  if (!userId) return invalidLink()

  // Forward the same (already verified) parameters to the confirmation page;
  // it re-verifies them itself before offering the button.
  const { searchParams } = new URL(request.url)
  const page = new URL('/unsubscribe', getRequestOrigin(request))
  page.searchParams.set('u', userId)
  page.searchParams.set('t', searchParams.get('t') ?? '')
  return NextResponse.redirect(page, { status: 303, headers: NO_STORE })
}

/** Which kind of POST this is. Unreadable bodies are treated as one-click. */
async function isPageSubmit(request: Request): Promise<boolean> {
  try {
    const form = await request.formData()
    return form.get('from') === 'page'
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  // Deliberately NOT rate-limited. One-click POSTs arrive from a handful of
  // mailbox-provider IPs on behalf of many members at once, so a per-IP budget
  // could refuse a genuine unsubscribe — the one request this route must never
  // drop. An unverified POST costs one HMAC and no database call, so there is
  // nothing for a flood to exhaust.
  const userId = verifiedUserId(request)
  if (!userId) return invalidLink()

  // Token verified — only now is the RLS-bypassing client used.
  const { error } = await adminClient
    .from('users')
    .update({ marketing_opt_in: false, marketing_opt_in_at: null })
    .eq('id', userId)

  if (error) {
    console.error('[Unsubscribe] update failed', error)
    return new NextResponse(
      "We couldn't update your email preferences just now. Please try again in a moment.",
      { status: 500, headers: { ...NO_STORE, 'Content-Type': 'text/plain; charset=utf-8' } },
    )
  }

  if (await isPageSubmit(request)) {
    return NextResponse.redirect(new URL('/unsubscribe?done=1', getRequestOrigin(request)), {
      status: 303,
      headers: NO_STORE,
    })
  }

  return new NextResponse("You've been unsubscribed from Stride marketing emails.", {
    status: 200,
    headers: { ...NO_STORE, 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
