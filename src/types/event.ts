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

/** Longest question label / option the schema accepts. The inputs cap at this too. */
export const MAX_FIELD_LABEL_LENGTH = 250
export const MAX_FIELD_OPTION_LENGTH = 250

export type AdditionalField = {
  id: string
  label: string
  type: AdditionalFieldType
  required: boolean
  placeholder?: string
  /** Allowed answers for the choice types. Absent on text/number/link. */
  options?: string[]
}

/**
 * The first reason a custom question can't be saved, phrased for the admin, or
 * null when every question is valid. Mirrors additionalFieldSchema so the form
 * and the server reject the same things — a question that fails the schema must
 * block the save, never vanish from it.
 */
export function findAdditionalFieldProblem(fields: AdditionalField[]): string | null {
  for (const [index, field] of fields.entries()) {
    const label = field.label.trim()
    const name = label ? `"${label.slice(0, 40)}${label.length > 40 ? '…' : ''}"` : `Question ${index + 1}`
    if (!label) return `${name} needs a question label.`
    if (label.length > MAX_FIELD_LABEL_LENGTH) {
      return `${name} is too long — keep questions to ${MAX_FIELD_LABEL_LENGTH} characters or fewer.`
    }
    if (!isChoiceFieldType(field.type)) continue
    const options = (field.options ?? []).map(o => o.trim())
    if (!options.some(Boolean)) return `Add at least one option to ${name}.`
    if (options.length > MAX_FIELD_OPTIONS) return `${name} can have at most ${MAX_FIELD_OPTIONS} options.`
    if (options.some(o => o.length > MAX_FIELD_OPTION_LENGTH)) {
      return `An option in ${name} is too long — keep options to ${MAX_FIELD_OPTION_LENGTH} characters or fewer.`
    }
  }
  return null
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
  /**
   * Who decides whether this tier is open, under progressive pricing.
   * Ignored entirely when the event is not progressive.
   */
  gate?: TierGate
}

/**
 * Under progressive pricing each tier is either following the sell-out rule or
 * pinned by an admin. Absent means `auto` — every tier authored before this
 * existed follows the rule, which is the behaviour an admin would expect.
 */
export const TIER_GATES = {
  AUTO: 'auto',
  OPEN: 'open',
  CLOSED: 'closed',
} as const

export type TierGate = (typeof TIER_GATES)[keyof typeof TIER_GATES]

/** Is this package's spot budget set, i.e. should registration enforce it? */
export function hasSpotBudget(pkg: Pick<EventPackage, 'spotsTotal'>): boolean {
  return typeof pkg.spotsTotal === 'number' && pkg.spotsTotal > 0
}

export type TierAvailability = {
  id: string
  selectable: boolean
  soldOut: boolean
  /** Which rule settled it. Surfaced in the admin form, never to a runner. */
  decidedBy: 'not-progressive' | 'auto' | 'admin-open' | 'admin-closed'
}

/**
 * Which tiers a runner may actually pick.
 *
 * The single source of truth for that question — the admin form, the
 * registration modal and the register route all read it, so what an admin sees,
 * what a runner is offered, and what the server will accept cannot drift apart.
 * The route is the one that matters: the modal only disables a button, and a
 * hand-posted form must be refused on the server.
 *
 * Progressive pricing opens exactly one tier at a time: the earliest, in the
 * order the admin authored them, that has not sold out. When it sells out the
 * next takes over — that is the whole of the automatic rule. An admin can pin
 * any tier open or closed, and that decision wins.
 *
 * A pinned-open tier still cannot be picked once its spots are gone. Capacity
 * is not a preference, and `register_for_event` would refuse it anyway; letting
 * the modal offer it would only produce a failed registration.
 */
export function resolveTierAvailability(
  packages: readonly EventPackage[],
  spotsTaken: Readonly<Record<string, number>>,
  progressive: boolean,
): TierAvailability[] {
  const isSoldOut = (pkg: EventPackage) =>
    hasSpotBudget(pkg) && (spotsTaken[pkg.id] ?? 0) >= (pkg.spotsTotal ?? 0)

  if (!progressive) {
    return packages.map(pkg => ({
      id: pkg.id,
      selectable: !isSoldOut(pkg),
      soldOut: isSoldOut(pkg),
      decidedBy: 'not-progressive' as const,
    }))
  }

  // The tier the automatic rule currently points at: the earliest that is
  // neither sold out nor held shut by an admin.
  //
  // Force-closed tiers are skipped, not merely refused. Otherwise closing the
  // active tier would close registration altogether — the tiers behind it are
  // all on `auto`, and `auto` would still be pointing at the tier the admin
  // just shut. Closing Early Bird should hand over to Premium, which is what an
  // admin doing it plainly means.
  //
  // -1 once every tier is sold out or closed, which correctly leaves nothing
  // on `auto` selectable.
  const activeIndex = packages.findIndex(
    pkg => !isSoldOut(pkg) && (pkg.gate ?? TIER_GATES.AUTO) !== TIER_GATES.CLOSED
  )

  return packages.map((pkg, index) => {
    const soldOut = isSoldOut(pkg)
    const gate = pkg.gate ?? TIER_GATES.AUTO

    if (gate === TIER_GATES.CLOSED) {
      return { id: pkg.id, selectable: false, soldOut, decidedBy: 'admin-closed' as const }
    }
    if (gate === TIER_GATES.OPEN) {
      return { id: pkg.id, selectable: !soldOut, soldOut, decidedBy: 'admin-open' as const }
    }
    return {
      id: pkg.id,
      selectable: index === activeIndex,
      soldOut,
      decidedBy: 'auto' as const,
    }
  })
}

/** Convenience for callers that only need the ids a runner may choose. */
export function selectableTierIds(
  packages: readonly EventPackage[],
  spotsTaken: Readonly<Record<string, number>>,
  progressive: boolean,
): Set<string> {
  return new Set(
    resolveTierAvailability(packages, spotsTaken, progressive)
      .filter(t => t.selectable)
      .map(t => t.id)
  )
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

/** Upper bound on coupons per event — keeps the admin list scannable. */
export const MAX_COUPONS = 20

/** Longest code an admin can author, and the cap the register route accepts. */
export const MAX_COUPON_CODE_LENGTH = 40

/**
 * A percentage discount an admin can attach to a paid event, redeemed by code.
 *
 * A row of `public.event_coupons`, not a JSON blob on the event: `active` has to
 * be flippable on its own so revoking is one row write rather than a whole-event
 * form save that two admins could race.
 *
 * `percent` is a whole number 1–100 and applies to the WHOLE total — the sum of
 * the selected packages, or `events.price_paise` for a standard-price event —
 * never per package. 100 is valid and means free; see `applyCoupon`.
 *
 * Codes never reach a browser that hasn't already redeemed them: the table has
 * RLS on with no policies, so only `adminClient` can read it.
 */
export type EventCoupon = {
  id: string
  code: string
  percent: number
  active: boolean
}

/**
 * What a registration actually redeemed, snapshotted onto the registration row.
 * Same reasoning as `SelectedPackage`: editing a coupon's percentage later must
 * not rewrite what someone was already charged.
 */
export type AppliedCoupon = {
  code: string
  percent: number
  discountPaise: number
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
