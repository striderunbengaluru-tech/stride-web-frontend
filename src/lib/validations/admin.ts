import { z } from 'zod'
import { MAX_FIELD_OPTIONS, MAX_COUPON_CODE_LENGTH, isChoiceFieldType, type AdditionalField, type EventPackage } from '@/types/event'
import {
  MAX_RACE_DISTANCES, MAX_CUSTOM_DISTANCE_LENGTH, MAX_RACE_POSTERS, MAX_RACE_COUPON_LENGTH, MIN_RACE_DISCOUNT_PERCENT, MAX_RACE_DISCOUNT_PERCENT,
  normaliseDistance,
} from '@/types/race'
import { validatePackageSpots } from '@/lib/events/package-spots'
import { istLocalToUtcIso } from '@/lib/utils/ist'

// Object.fromEntries(formData) always includes every field's key, so an empty
// input arrives as '' rather than being absent. z.coerce.number() turns '' into
// 0, which then fails .positive() — and because the key IS present, .optional()
// can't rescue it. The whole safeParse failed, and the actions' bare
// `if (!parsed.success) return` made a blank Capacity or Distance silently
// abandon the entire save. Mapping blank to undefined restores .optional().
const blankToUndefined = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v)

export const additionalFieldSchema = z.object({
  id:          z.string().min(1),
  label:       z.string().trim().min(1).max(80),
  type:        z.enum(['text', 'number', 'link', 'mcq', 'dropdown']),
  required:    z.boolean(),
  placeholder: z.string().max(120).optional(),
  // Choices for the mcq/dropdown types. Stored trimmed, de-duplicated and with
  // blanks dropped, so the saved list is exactly what the runner may answer and
  // what the register route validates against.
  options:     z.array(z.string().trim().max(80)).max(MAX_FIELD_OPTIONS).optional(),
})
  .transform(({ options, ...field }): AdditionalField => {
    if (!isChoiceFieldType(field.type)) return field
    return { ...field, options: [...new Set((options ?? []).filter(Boolean))] }
  })
  // A choice question with nothing to choose from would render an empty radio
  // group, and (if required) could never be satisfied.
  .refine(
    (field) => !isChoiceFieldType(field.type) || (field.options?.length ?? 0) > 0,
    'Multiple-choice and dropdown questions need at least one option',
  )

export const additionalFieldsArraySchema = z.array(additionalFieldSchema)

// A priced tier the runner picks at registration. `amountPaise` is integer paise
// so it never suffers float rounding, and 0 is allowed on purpose — a free
// package can sit alongside paid ones ("run only" vs "run + tee").
export const eventPackageSchema = z.object({
  id:          z.string().min(1),
  name:        z.string().trim().min(1).max(80),
  details:     z.string().max(2000).default(''),
  amountPaise: z.number().int().min(0).max(100_000_000),
  // How many of the event's spots this package may take. Optional at the entry
  // level on purpose: sanitisePackages drops entries that fail this schema, so
  // requiring it here would silently delete every package authored before spots
  // existed. The sum-equals-capacity rule (validatePackageSpots, applied to the
  // whole list below) is what actually forces the admin to fill these in.
  spotsTotal:  z.number().int().min(1).max(100_000).optional(),
  // Progressive pricing only. Absent = 'auto' = follow the sell-out rule, which
  // is what every tier authored before this feature should do.
  gate:        z.enum(['auto', 'open', 'closed']).optional(),
})

export const eventPackagesArraySchema = z.array(eventPackageSchema)

export const eventSchema = z.object({
  name: z.string().trim().min(1, 'Event name is required').max(100),
  subtitle: z.string().max(200).optional(),
  details: z.string().trim().min(1, 'Full details are required'),
  location: z.string().trim().min(1, 'Location name is required').max(200),
  locationUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  postRunLocation: z.string().max(200).optional(),
  postRunLocationUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  stravaRouteUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  eventDate: z.string().trim().min(1, 'Start date & time is required'),
  endDate: z.string().optional(),
  capacity: z.preprocess(
    blankToUndefined,
    z.coerce.number({ error: 'Capacity is required' }).int().positive('Capacity must be at least 1'),
  ),
  distanceKm: z.preprocess(
    blankToUndefined,
    z.coerce.number().positive().max(500).optional(),
  ),
  difficulty: z.string().max(60).optional(),
  // Admin enters the price in rupees with up to 2 decimals (e.g. 2000.50).
  // Stored as integer paise (price_paise) in the action — paise is the unit
  // Razorpay charges in and avoids floating-point money errors.
  // No .default(0): a blank price and a deliberate ₹0 must be distinguishable so
  // the superRefine below can insist the admin states the price out loud. The
  // action reads it as `priceRupees ?? 0`.
  priceRupees: z.preprocess(
    blankToUndefined,
    z.coerce.number().min(0, 'Price cannot be negative').max(1_000_000, 'Price is too large').optional(),
  ),
  // Checkbox/switch posts 'true' | 'false' via a hidden input; absent = false
  showSpotsLeft: z.preprocess((v) => v === 'true' || v === 'on' || v === true, z.boolean()),
  // Staging-only event: never surfaced on the production deployment, whatever
  // its status. Used to exercise features against real data without the live
  // site showing it.
  isTestEvent: z.preprocess((v) => v === 'true' || v === 'on' || v === true, z.boolean()),
  // Registering becomes a free application an admin approves. Price and
  // packages are ignored while it's on but stay on the row, so the price rule
  // in superRefine still applies — the admin states the price the event will
  // charge the moment this is switched back off.
  inviteOnly: z.preprocess((v) => v === 'true' || v === 'on' || v === true, z.boolean()),
  // Closes new sign-ups whether or not capacity is reached, and whether or not
  // invite-only is on. Existing registrations and applications are untouched —
  // there is no cross-field rule here because closing is always a valid state
  // for any event.
  registrationsClosed: z.preprocess((v) => v === 'true' || v === 'on' || v === true, z.boolean()),
  // Opt-in switch for the booking-confirmation email. Off by default because
  // Brevo's free tier allows 300 transactional sends a day and a large open run
  // would burn through it — an admin turns it on per event, deliberately.
  confirmationEmailEnabled: z.preprocess((v) => v === 'true' || v === 'on' || v === true, z.boolean()),
  // Master switch for coupon codes. The codes themselves are rows in
  // event_coupons, managed separately — this only decides whether they work.
  couponsEnabled: z.preprocess((v) => v === 'true' || v === 'on' || v === true, z.boolean()),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).default('DRAFT'),
  confirmationText: z.string().max(2000).optional(),
  termsText: z.string().max(5000).optional(),
  bannerImages: z.string().optional(), // JSON array of uploaded image URLs
  additionalFields: z.string().optional(), // JSON array of AdditionalField objects
  packages: z.string().optional(), // JSON array of EventPackage objects
  // When enabled the charge is the sum of the packages the runner picks and
  // priceRupees is ignored. Multi-select lets them combine several.
  packagesEnabled: z.preprocess((v) => v === 'true' || v === 'on' || v === true, z.boolean()),
  packagesMultiSelect: z.preprocess((v) => v === 'true' || v === 'on' || v === true, z.boolean()),
  // Opens one tier at a time, earliest-not-sold-out first, unless an admin has
  // pinned a tier open or closed. See resolveTierAvailability in @/types/event.
  packagesProgressive: z.preprocess((v) => v === 'true' || v === 'on' || v === true, z.boolean()),
})
  // Cross-field rules. The form checks all of these before it posts; these are
  // the server-side backstop, so a hand-rolled POST can't create an event the UI
  // would have refused.
  .superRefine((data, ctx) => {
    if (parseJsonArray(data.bannerImages).length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['bannerImages'],
        message: 'Add at least one banner image',
      })
    }

    if (!data.packagesEnabled && data.priceRupees === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['priceRupees'],
        message: 'Price is required — enter 0 for a free event',
      })
    }

    const spotsProblem = validatePackageSpots(
      parseJsonArray<EventPackage>(data.packages),
      data.capacity,
      data.packagesEnabled,
    )
    if (spotsProblem) {
      ctx.addIssue({ code: 'custom', path: [spotsProblem.field], message: spotsProblem.message })
    }
  })

// The form posts these as JSON strings. A malformed value is treated as empty
// rather than throwing — the required-field issues above then report it.
function parseJsonArray<T>(raw: string | undefined): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch { return [] }
}

export type EventFormData = z.infer<typeof eventSchema>

/**
 * What the event server actions return on rejection. `field` names the control
 * the client should scroll to and focus (see @/lib/utils/form-errors).
 *
 * Lives here rather than in the `'use server'` actions module so nothing but
 * async functions is exported from there, and so the client form can import the
 * type without reaching into a server file.
 */
export type EventActionResult = { error: string; field?: string } | void

/**
 * Visual top-to-bottom order of the event form's fields. The actions use it to
 * pick WHICH of several validation issues to report, so the toast always names
 * the topmost problem — the one the admin will fix first.
 */
export const EVENT_FIELD_ORDER = [
  'name',
  'subtitle',
  'details',
  'eventDate',
  'endDate',
  'capacity',
  'priceRupees',
  'distanceKm',
  'difficulty',
  'location',
  'locationUrl',
  'postRunLocation',
  'postRunLocationUrl',
  'stravaRouteUrl',
  'packages',
  'additionalFields',
  'bannerImages',
] as const

// A percentage-off code on a paid event. Stored as a row in event_coupons, so
// unlike packages this is validated per submission rather than as a whole array.
//
// The charset is narrow on purpose: a code has to be read off a poster or a
// WhatsApp message and typed back correctly, so spaces and punctuation that
// look different in different fonts are excluded rather than trimmed later.
export const eventCouponSchema = z.object({
  // Present when editing, absent when adding.
  id: z.string().min(1).optional(),
  code: z.string()
    .trim()
    .min(3, 'A coupon code needs at least 3 characters')
    .max(MAX_COUPON_CODE_LENGTH, `Keep the code under ${MAX_COUPON_CODE_LENGTH} characters`)
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Use letters, numbers, hyphens and underscores only'),
  percent: z.coerce.number()
    .int('Use a whole number')
    .min(1, 'The discount must be at least 1%')
    .max(100, 'The discount cannot exceed 100%'),
})

export type EventCouponFormData = z.infer<typeof eventCouponSchema>

// ── Races ────────────────────────────────────────────────────────────────────

// The race form posts array-valued fields as JSON strings through hidden mirror
// inputs (Object.fromEntries(formData) keeps only the last value of a repeated
// key). This turns that string into an array BEFORE the element schema runs, so
// the action receives a typed string[] rather than re-parsing JSON.
const jsonStringToArray = (v: unknown): unknown[] =>
  typeof v === 'string' ? parseJsonArray<unknown>(v) : Array.isArray(v) ? v : []

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const HH_MM = /^\d{2}:\d{2}$/

export const raceSchema = z.object({
  name: z.string().trim().min(1, 'Race name is required').max(120),
  // Markdown. Optional: a poster plus a link is a complete listing.
  description: z.string().max(20_000).optional(),
  // <input type="date"> — the IST calendar day the race is run.
  raceDate: z.string().trim().regex(ISO_DATE, 'Race date is required'),
  // <input type="time">. Blank when the organiser has not announced a start;
  // the action then stores 00:00 IST and sets has_start_time = false.
  startTime: z.preprocess(
    blankToUndefined,
    z.string().regex(HH_MM, 'Enter a valid start time').optional(),
  ),
  city: z.string().trim().min(1, 'City is required').max(100),
  venue: z.string().trim().max(200).optional(),
  organizer: z.string().trim().max(120).optional(),
  // Canonical codes (3K … ULTRA) and free-text customs like "15K". Normalised
  // to upper case and de-duplicated so "15k" and "15K" cannot both be saved.
  distances: z.preprocess(
    jsonStringToArray,
    z.array(
      z.string().trim().min(1).max(MAX_CUSTOM_DISTANCE_LENGTH, 'Keep each distance short')
        .regex(/^[A-Za-z0-9 .+-]+$/, 'Distances may only use letters, numbers, spaces, ., + and -'),
    )
      .min(1, 'Pick at least one distance')
      .max(MAX_RACE_DISTANCES, `At most ${MAX_RACE_DISTANCES} distances`),
  ).transform(list => [...new Set(list.map(normaliseDistance))]),
  // Pasted as-is from the organiser. No UTM builder.
  registrationUrl: z.preprocess(
    blankToUndefined,
    z.string().trim().url('Must be a valid URL').max(2000).optional(),
  ),
  // A third-party code shown to runners, so it is display text rather than
  // something we redeem — only length is constrained.
  couponCode: z.preprocess(
    blankToUndefined,
    z.string().trim()
      .min(2, 'A coupon code needs at least 2 characters')
      .max(MAX_RACE_COUPON_LENGTH, `Keep the code under ${MAX_RACE_COUPON_LENGTH} characters`)
      .optional(),
  ),
  // Whole percent off, displayed next to the code. Meaningless without one.
  discountPercent: z.preprocess(
    blankToUndefined,
    z.coerce.number()
      .int('Use a whole number')
      .min(MIN_RACE_DISCOUNT_PERCENT, `At least ${MIN_RACE_DISCOUNT_PERCENT}%`)
      .max(MAX_RACE_DISCOUNT_PERCENT, `At most ${MAX_RACE_DISCOUNT_PERCENT}%`)
      .optional(),
  ),
  // <input type="datetime-local">, IST wall clock like events.endDate.
  registrationDeadline: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).default('DRAFT'),
  // Public storage URLs from /api/admin/upload-event-cover with kind=race.
  posterImages: z.preprocess(
    jsonStringToArray,
    z.array(z.string().url()).max(MAX_RACE_POSTERS, `At most ${MAX_RACE_POSTERS} posters`),
  ),
})
  // Cross-field rules — the server-side backstop for what the form checks
  // before posting. The database repeats the first one as a CHECK constraint.
  .superRefine((data, ctx) => {
    if (!data.registrationUrl && !data.couponCode) {
      ctx.addIssue({
        code: 'custom',
        path: ['registrationUrl'],
        message: 'Add a registration link or a coupon code — runners need at least one.',
      })
    }

    if (data.discountPercent !== undefined && !data.couponCode) {
      ctx.addIssue({ code: 'custom', path: ['discountPercent'], message: 'A discount needs a coupon code to go with it' })
    }

    // A deadline after the race is a typo, not a policy. ISO strings compare
    // lexically, which is exact for two instants in the same format.
    if (data.registrationDeadline) {
      const deadline = istLocalToUtcIso(data.registrationDeadline)
      const raceEnd = istLocalToUtcIso(`${data.raceDate}T23:59`)
      if (!deadline) {
        ctx.addIssue({ code: 'custom', path: ['registrationDeadline'], message: 'Enter a valid registration deadline' })
      } else if (raceEnd && deadline > raceEnd) {
        ctx.addIssue({ code: 'custom', path: ['registrationDeadline'], message: 'The registration deadline must be on or before race day' })
      }
    }
  })

export type RaceFormData = z.infer<typeof raceSchema>
export type RaceActionResult = EventActionResult

/** Visual top-to-bottom order of the race form — see EVENT_FIELD_ORDER. */
export const RACE_FIELD_ORDER = [
  'name',
  'description',
  'raceDate',
  'startTime',
  'registrationDeadline',
  'city',
  'venue',
  'organizer',
  'distances',
  'registrationUrl',
  'couponCode',
  'discountPercent',
  'posterImages',
] as const

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  pricePaise: z.coerce.number().int().positive('Price must be greater than 0'),
  stock: z.coerce.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  imageUrl: z.string().optional(),
})

export type ProductFormData = z.infer<typeof productSchema>
