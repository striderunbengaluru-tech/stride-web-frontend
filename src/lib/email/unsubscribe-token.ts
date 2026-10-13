import { createHmac, timingSafeEqual } from 'node:crypto'
import { PRODUCTION_SITE_URL } from '@/lib/site-url'

// Signed one-click unsubscribe links for marketing email.
//
// SOURCE OF TRUTH for the token algorithm. The promo send scripts
// (scripts/send-*-emails.mjs) can't import TypeScript, so they reimplement it
// with node:crypto — any change here must be mirrored there, or every link in
// the next send will be refused.
//
//   token = hex( HMAC-SHA256( key = STRIDE_UNSUBSCRIBE_SECRET, message = userId ) )
//
// Stateless on purpose: nothing to store, nothing to expire, and a link in a
// two-year-old email still works — unsubscribing must never be harder than
// subscribing. The token proves only "Stride minted a link for this user id",
// which is exactly the authority an unsubscribe needs and no more: it can turn
// marketing mail OFF and do nothing else.
//
// The user id does appear in the URL. That's the unavoidable cost of a
// stateless token, and it is low: the id is an opaque auth identifier, it only
// ever travels in an email to that same user, and on its own it unlocks nothing.
//
// Server-only: the secret must never reach a client bundle. Nothing under
// src/components imports this.

const SECRET_ENV = 'STRIDE_UNSUBSCRIBE_SECRET'
const UNSUBSCRIBE_PATH = '/api/email/unsubscribe'

/** Hex SHA-256 digest length — every genuine token is exactly this long. */
export const UNSUBSCRIBE_TOKEN_LENGTH = 64

function secret(): string | null {
  const value = process.env[SECRET_ENV]
  return value && value.length > 0 ? value : null
}

/**
 * The token for one user. Throws when the secret is unset: a sender that
 * quietly emitted unverifiable links would ship mail nobody can unsubscribe
 * from, which is worse than not sending.
 */
export function createUnsubscribeToken(userId: string): string {
  const key = secret()
  if (!key) throw new Error(`${SECRET_ENV} is not set — cannot mint unsubscribe links`)
  return createHmac('sha256', key).update(userId).digest('hex')
}

/**
 * Constant-time check of a presented token. False — never a throw — for a
 * missing secret, a wrong length or a mismatch, so callers have one failure
 * branch and the response never hints at which check failed.
 */
export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const key = secret()
  if (!key) return false

  const expected = Buffer.from(createHmac('sha256', key).update(userId).digest('hex'), 'utf8')
  const presented = Buffer.from(token, 'utf8')
  // timingSafeEqual throws on unequal lengths, so compare lengths first. The
  // length of a genuine token is public (always 64), so this leaks nothing.
  if (presented.length !== expected.length) return false
  return timingSafeEqual(expected, presented)
}

/**
 * The absolute unsubscribe URL for one user — used for the footer link AND the
 * `List-Unsubscribe` header. Always the production origin: an email outlives
 * the deployment that sent it (see PRODUCTION_SITE_URL in @/lib/site-url).
 */
export function unsubscribeUrl(userId: string): string {
  const url = new URL(UNSUBSCRIBE_PATH, PRODUCTION_SITE_URL)
  url.searchParams.set('u', userId)
  url.searchParams.set('t', createUnsubscribeToken(userId))
  return url.toString()
}
