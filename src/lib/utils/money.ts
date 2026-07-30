import type { EventPackage } from '@/types/event'
import { sumPackageAmountPaise } from '@/types/event'

/**
 * Money lives in integer paise everywhere — it's the unit Razorpay charges in,
 * and it keeps totals free of floating-point rounding. These are the only two
 * places paise becomes something a human reads.
 */

/** `50000` → `"₹500"`. Does not special-case zero — see `priceLabel`. */
export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

/** `0` → `"Free"`, otherwise `"₹500"`. What listings and CTAs show. */
export function priceLabel(paise: number): string {
  return paise === 0 ? 'Free' : formatRupees(paise)
}

/**
 * The headline price for an event, which depends on how it's priced:
 * - packages, multi-select → "From ₹X", since the runner builds their own total
 * - packages, single-select → "From ₹X" too when they differ, else the flat price
 * - no packages → the fixed price
 *
 * Falls back to the fixed price if packages are enabled but none survived
 * validation, which the admin action should prevent but a hand-edited row could not.
 */
export function eventPriceLabel(
  pricePaise: number,
  packages: readonly EventPackage[],
  packagesEnabled: boolean
): string {
  if (!packagesEnabled || packages.length === 0) return priceLabel(pricePaise)

  const amounts = packages.map(pkg => pkg.amountPaise)
  const cheapest = Math.min(...amounts)
  const dearest = Math.max(...amounts)

  if (cheapest === dearest) return priceLabel(cheapest)
  return `From ${priceLabel(cheapest)}`
}

/** Total for a selection, formatted. `[]` → "Free". */
export function selectionTotalLabel(
  selected: readonly { amountPaise: number }[]
): string {
  return priceLabel(sumPackageAmountPaise(selected))
}
