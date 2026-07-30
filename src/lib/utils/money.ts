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

/**
 * The exact string `priceLabel` produces for a free event. Exported so callers
 * that style "free" differently can test for it instead of re-deriving it from
 * `price_paise` — which is 0 on a package event and would wrongly read as free.
 */
export const FREE_LABEL = 'Free'

/** `0` → `"Free"`, otherwise `"₹500"`. What listings and CTAs show. */
export function priceLabel(paise: number): string {
  return paise === 0 ? FREE_LABEL : formatRupees(paise)
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

/**
 * `eventPriceLabel` for a raw DB row: `events.packages` is a JSON *string*
 * column, so every listing surface would otherwise repeat the same parse and
 * try/catch. Malformed JSON falls back to the fixed price rather than throwing.
 *
 * Use this anywhere a card, banner or list shows an event's headline price — it
 * is the reason those surfaces agree with the event detail page.
 */
export function eventRowPriceLabel(
  pricePaise: number,
  packagesJson: string | null | undefined,
  packagesEnabled: boolean | null | undefined
): string {
  if (!packagesEnabled) return priceLabel(pricePaise)

  let packages: EventPackage[] = []
  try {
    const parsed = JSON.parse(packagesJson ?? '[]')
    if (Array.isArray(parsed)) packages = parsed as EventPackage[]
  } catch { /* fall through to the fixed price */ }

  return eventPriceLabel(pricePaise, packages, true)
}

/** Total for a selection, formatted. `[]` → "Free". */
export function selectionTotalLabel(
  selected: readonly { amountPaise: number }[]
): string {
  return priceLabel(sumPackageAmountPaise(selected))
}
