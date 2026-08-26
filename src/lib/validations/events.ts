import { z } from 'zod'
import { isPlausibleDob, MIN_REGISTRATION_AGE } from '@/lib/utils/age'
import { MAX_COUPON_CODE_LENGTH } from '@/types/event'

// 10 or 11 digits, digits only — no spaces, letters, or symbols.
const phoneNumber = (label: string) =>
  z.string().trim().regex(/^\d{10,11}$/, `Enter a valid 10 or 11 digit ${label} (digits only)`)

export const participantDetailsSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  // Shape *and* plausibility: a well-formed date that makes the runner 0 years
  // old is a mis-set picker, not a participant. Mirrors the client so the form
  // and the API agree on what a real date of birth is.
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date of birth')
    .refine(isPlausibleDob, `Please check your date of birth — you must be at least ${MIN_REGISTRATION_AGE} to register`),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  contactNumber: phoneNumber('contact number'),
  emergencyContactNumber: phoneNumber('emergency contact number'),
}).refine(
  (d) => d.contactNumber !== d.emergencyContactNumber,
  { message: 'Emergency number must be different from your contact number', path: ['emergencyContactNumber'] },
)

export const registerEventSchema = z.object({
  eventId: z.string().min(1),
  acceptedTerms: z.boolean().optional(),
  // Package IDS ONLY. Amounts are never accepted from the client — the register
  // route looks each id up on the event row and sums the admin's own prices.
  selectedPackageIds: z.array(z.string().min(1)).max(50).optional().default([]),
  customResponses: z.record(z.string(), z.union([z.string(), z.number()])).optional().default({}),
  // The CODE ONLY, for exactly the same reason as the package ids above: the
  // percentage and the discount are looked up server-side. A client that could
  // send `percent` could send 100.
  couponCode: z.string().trim().min(1).max(MAX_COUPON_CODE_LENGTH).optional(),
}).and(participantDetailsSchema)

/** Body of POST /api/events/coupon/validate. */
export const validateCouponSchema = z.object({
  eventId: z.string().min(1),
  code: z.string().trim().min(1).max(MAX_COUPON_CODE_LENGTH),
  // The subtotal is recomputed from these server-side. The client never gets to
  // say what the discount applies to.
  selectedPackageIds: z.array(z.string().min(1)).max(50).optional().default([]),
})

export type RegisterEventInput = z.infer<typeof registerEventSchema>
export type ParticipantDetailsInput = z.infer<typeof participantDetailsSchema>
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>
