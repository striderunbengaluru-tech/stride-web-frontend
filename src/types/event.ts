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
