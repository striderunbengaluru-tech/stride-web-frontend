export type AdditionalFieldType = 'text' | 'number' | 'link' | 'mcq' | 'dropdown'

/**
 * Types whose answer must be one of a fixed list the admin defines:
 * `mcq` renders every option as a radio, `dropdown` puts them in a select.
 * Both validate the submitted answer against `options` server-side.
 */
export const CHOICE_FIELD_TYPES = ['mcq', 'dropdown'] as const

export function isChoiceFieldType(type: AdditionalFieldType): boolean {
  return (CHOICE_FIELD_TYPES as readonly string[]).includes(type)
}

/** Upper bound on choices per question — keeps the registration form usable. */
export const MAX_FIELD_OPTIONS = 20

export type AdditionalField = {
  id: string
  label: string
  type: AdditionalFieldType
  required: boolean
  placeholder?: string
  /** Allowed answers for the choice types. Absent on text/number/link. */
  options?: string[]
}

export type CustomResponses = Record<string, string | number>

/** Upper bound on packages per event — keeps the registration modal usable. */
export const MAX_PACKAGES = 10

/**
 * A priced tier an event can offer instead of a single fixed price. When
 * `events.packages_enabled` is true the charge is the sum of the packages the
 * runner picks, and `events.price_paise` is ignored.
 *
 * `amountPaise` is integer paise (Razorpay's unit), the same as
 * `events.price_paise`. Zero is valid — a free package alongside paid ones lets
 * an event offer "run only" next to "run + tee".
 */
export type EventPackage = {
  id: string
  name: string
  /** Markdown, rendered with react-markdown. Never as raw HTML. */
  details: string
  amountPaise: number
  /**
   * How many of the event's spots this package may take. The admin form
   * requires every package to carry one and requires the sum to equal
   * `events.capacity`.
   *
   * Absent or `<= 0` means "not budgeted": packages authored before spots
   * existed, which the migration backfilled with 0. Those keep registering
   * against the event's total capacity alone, so a live event can't break —
   * but the admin form blocks the next save until real numbers are entered.
   */
  spotsTotal?: number
}

/** Is this package's spot budget set, i.e. should registration enforce it? */
export function hasSpotBudget(pkg: Pick<EventPackage, 'spotsTotal'>): boolean {
  return typeof pkg.spotsTotal === 'number' && pkg.spotsTotal > 0
}

/**
 * What a registration actually bought, snapshotted onto the registration row.
 * Stored rather than referenced by id so a later admin price or name edit can't
 * rewrite someone's existing receipt.
 */
export type SelectedPackage = {
  id: string
  name: string
  amountPaise: number
}

/** Sums a selection. Single source of truth for "what do we charge". */
export function sumPackageAmountPaise(
  packages: readonly { amountPaise: number }[]
): number {
  return packages.reduce((total, pkg) => total + pkg.amountPaise, 0)
}

/**
 * Sums the spot budgets. Single source of truth for "does the allocation add up
 * to capacity". Unset budgets count as 0, which is exactly what makes a legacy
 * event fail the equality check and force the admin to fill the numbers in.
 */
export function sumPackageSpots(
  packages: readonly { spotsTotal?: number }[]
): number {
  return packages.reduce((total, pkg) => total + (pkg.spotsTotal ?? 0), 0)
}
