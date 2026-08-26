import type { EventCoupon } from '@/types/event'

// Coupon arithmetic, in one place.
//
// Three callers have to agree to the paisa or a member sees one number and is
// charged another: the admin form's price preview, the /api/events/coupon/validate
// endpoint the modal calls, and the register route that actually creates the
// Razorpay order. Same reason `resolveTierAvailability` is shared rather than
// reimplemented per surface.

/**
 * Razorpay rejects an order below ₹1, so a payable of 1–99 paise is not a price
 * we can charge — the order creation fails and the member is stranded with an
 * opaque "Payment initialisation failed".
 */
export const RAZORPAY_MIN_PAISE = 100

export type CouponMath = {
  /** Total before the discount. */
  subtotalPaise: number
  /** What comes off. Never more than the subtotal. */
  discountPaise: number
  /** What the member actually pays. Zero means take the free path. */
  payablePaise: number
  /**
   * True when the percentage did not reach 100 but the remainder was under ₹1
   * and got snapped to free. Surfaced so the admin preview can say so rather
   * than showing a number that silently disagrees with the arithmetic.
   */
  snappedToFree: boolean
}

/** A whole number 1–100. Anything else is an authoring or tampering bug. */
export function isValidCouponPercent(percent: unknown): percent is number {
  return typeof percent === 'number'
    && Number.isInteger(percent)
    && percent >= 1
    && percent <= 100
}

/**
 * Applies a percentage to a subtotal, in integer paise.
 *
 * Rounding is `Math.round`, which lands 100% exactly on the subtotal so a
 * full-discount coupon always produces a payable of 0 and never a stray paisa.
 *
 * The sub-rupee snap looks arbitrary but is not: a 99% coupon on a ₹99 event
 * leaves 99 paise, which Razorpay will not take. Charging nothing is the only
 * outcome that neither strands the member nor silently overcharges them, and it
 * is what the admin intended by discounting that far in the first place.
 */
export function applyCoupon(subtotalPaise: number, percent: number): CouponMath {
  const subtotal = Math.max(0, Math.trunc(subtotalPaise))

  if (!isValidCouponPercent(percent) || subtotal === 0) {
    return { subtotalPaise: subtotal, discountPaise: 0, payablePaise: subtotal, snappedToFree: false }
  }

  const discount = Math.min(subtotal, Math.round((subtotal * percent) / 100))
  const payable = subtotal - discount

  if (payable > 0 && payable < RAZORPAY_MIN_PAISE) {
    return { subtotalPaise: subtotal, discountPaise: subtotal, payablePaise: 0, snappedToFree: true }
  }

  return { subtotalPaise: subtotal, discountPaise: discount, payablePaise: payable, snappedToFree: false }
}

/**
 * Normalises a code for comparison and storage: trimmed and upper-cased, so
 * `stride25`, ` STRIDE25 ` and `Stride25` are one coupon. Matches the
 * `unique (event_id, upper(code))` index the table carries.
 */
export function normaliseCouponCode(raw: string): string {
  return raw.trim().toUpperCase()
}

/**
 * Finds an active coupon by code among an event's coupons.
 *
 * Returns undefined for both "no such code" and "revoked", because every caller
 * must report those identically — telling them apart hands a prober a way to
 * confirm which codes exist.
 */
export function findRedeemableCoupon(
  coupons: readonly EventCoupon[],
  rawCode: string
): EventCoupon | undefined {
  const code = normaliseCouponCode(rawCode)
  if (!code) return undefined
  return coupons.find(coupon => coupon.active && normaliseCouponCode(coupon.code) === code)
}
