import { adminClient } from '@/lib/supabase/admin'
import { normaliseCouponCode } from '@/lib/events/coupons'
import type { EventCoupon } from '@/types/event'

/**
 * Resolves a redeemable coupon for an event, or null.
 *
 * Shared by /api/events/coupon/validate and the register route so the two can
 * never disagree about whether a code is live. The register route calls this a
 * SECOND time at submit, deliberately: the member's earlier successful preview
 * is not evidence, because an admin may have revoked in between and revocation
 * is meant to bite immediately.
 *
 * Reads through `adminClient` with no caching of any kind. A cached read here
 * would put a window on revocation, which is the one thing this must not do.
 *
 * Returns null for every failure — no such code, revoked, coupons switched off
 * on the event, event missing. Callers must report all of those with one
 * identical message: distinguishing them lets someone probe which codes exist.
 */
export async function findActiveCoupon(
  eventId: string,
  rawCode: string
): Promise<EventCoupon | null> {
  const code = normaliseCouponCode(rawCode)
  if (!code) return null

  const [{ data: event }, { data: rows }] = await Promise.all([
    adminClient
      .from('events')
      .select('coupons_enabled')
      .eq('id', eventId)
      .maybeSingle(),
    // Filtered on active here rather than in JS so a revoked row never leaves
    // the database. `code` is matched case-insensitively to mirror the
    // unique (event_id, upper(code)) index.
    adminClient
      .from('event_coupons')
      .select('id, code, percent, active')
      .eq('event_id', eventId)
      .eq('active', true)
      .ilike('code', code),
  ])

  if (!event || event.coupons_enabled !== true) return null

  // ilike has no wildcards here, so this is an exact case-insensitive match,
  // but the comparison is repeated in JS because ilike's collation is the
  // database's business and the unique index is defined on upper(code).
  const match = (rows ?? []).find(row => normaliseCouponCode(row.code) === code)
  if (!match) return null

  return { id: match.id, code: match.code, percent: match.percent, active: match.active }
}

/**
 * Every active coupon on an event, for the admin editor. Never called from a
 * public surface — codes are secret, and the table's RLS (enabled, no policies)
 * means only the service-role client can read them at all.
 */
export async function listEventCoupons(eventId: string): Promise<EventCoupon[]> {
  const { data, error } = await adminClient
    .from('event_coupons')
    .select('id, code, percent, active')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(`[coupons] Could not list coupons for ${eventId}:`, error.message)
    return []
  }
  return (data ?? []) as EventCoupon[]
}
