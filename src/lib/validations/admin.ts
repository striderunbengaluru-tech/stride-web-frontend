import { z } from 'zod'
import { MAX_FIELD_OPTIONS, isChoiceFieldType, type AdditionalField, type EventPackage } from '@/types/event'
import { validatePackageSpots } from '@/lib/events/package-spots'

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

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  pricePaise: z.coerce.number().int().positive('Price must be greater than 0'),
  stock: z.coerce.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  imageUrl: z.string().optional(),
})

export type ProductFormData = z.infer<typeof productSchema>
