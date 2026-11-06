/**
 * The invite-only vocabulary, in one place.
 *
 * Deliberately free of `sonner` and of any server-only import so the register
 * route, the server components and the client components can all use it — the
 * same reasoning as `@/lib/events/package-spots`.
 *
 * Invite-only is a SELECTION model, not a visibility model: the event stays
 * publicly listed and carries a badge. What changes is that registering
 * becomes a free application an admin has to approve. On a paid event the
 * approval lands on AWAITING_PAYMENT, and the runner pays to confirm.
 */

import { FREE_LABEL } from '@/lib/utils/money'

export const REGISTRATION_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'APPLIED',
  'REJECTED',
  'AWAITING_PAYMENT',
] as const

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number]

/** An invite-only application awaiting Stride's decision. */
export const APPLIED: RegistrationStatus = 'APPLIED'
/** An application Stride turned down. Permanent for that application. */
export const REJECTED: RegistrationStatus = 'REJECTED'
/**
 * Approved on a paid invite-only event, not yet paid. Holds a seat until the
 * runner pays or an admin revokes the approval. Never clearable by the
 * register route.
 */
export const AWAITING_PAYMENT: RegistrationStatus = 'AWAITING_PAYMENT'

/**
 * Statuses the confirmation page will render. PENDING (checkout in flight) and
 * CANCELLED (payment failed) still 404 — there is nothing to show for either.
 */
export const VIEWABLE_REGISTRATION_STATUSES: ReadonlySet<string> = new Set<RegistrationStatus>([
  'CONFIRMED',
  'APPLIED',
  'REJECTED',
])

/**
 * Statuses the register route may clear so the runner can start again.
 *
 * A positive allowlist rather than `!== 'CONFIRMED'`: when a sixth status is
 * added in a year and someone forgets a guard, the delete no-ops instead of
 * destroying the row. REJECTED is in the list because a runner who wasn't
 * selected may still buy a ticket once invite-only is switched off — but the
 * route checks the flag before it gets here, so they cannot re-apply while the
 * mode is still on.
 */
export const CLEARABLE_REGISTRATION_STATUSES = ['PENDING', 'CANCELLED', 'REJECTED'] as const

/**
 * Member-facing labels. These appear on My Runs, the confirmation page and the
 * event CTA, and would drift if each surface spelled them out itself.
 */
export const AWAITING_LABEL = 'Awaiting invitation acceptance'
export const NOT_SELECTED_LABEL = 'Not selected'
export const PAYMENT_DUE_LABEL = 'Selected. Payment pending'

/**
 * The public price label for an invite-only event. A paid one's fee is shown
 * only to the runners it shortlists, so the public sees no price at all: an
 * empty label, which every price slot treats as "render nothing". A free one
 * still reads "Free".
 */
export function inviteOnlyPriceLabel(pricePaise: number | null): string {
  return (pricePaise ?? 0) > 0 ? '' : FREE_LABEL
}

/** Same rule for agent surfaces (markdown twins, MCP), which need words. */
export function inviteOnlyAgentPriceLabel(pricePaise: number | null): string {
  return (pricePaise ?? 0) > 0 ? 'Fee shared with shortlisted applicants' : 'Free to apply'
}
