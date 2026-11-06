import { z } from 'zod'
import { PHONE_DIGITS, PHONE_PATTERN } from '@/lib/utils/phone'

export const SLAY_NAME_MAX = 80
export const SLAY_REASON_MIN = 10
export const SLAY_REASON_MAX = 500

// Instagram's own rule: 1–30 letters, digits, periods and underscores.
const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/

export const slayApplicationSchema = z.object({
  fullName: z.string().trim()
    .min(2, 'Please enter your full name')
    .max(SLAY_NAME_MAX, `Keep your name under ${SLAY_NAME_MAX} characters`),
  // Lower-cased so the one-application-per-email index matches regardless of case.
  email: z.string().trim().toLowerCase()
    .pipe(z.email('Enter a valid email address').max(254, 'Enter a valid email address')),
  whatsapp: z.string().trim()
    .regex(PHONE_PATTERN, `Enter your ${PHONE_DIGITS}-digit WhatsApp number (digits only)`),
  // Stored without the '@' so the same person can't apply twice as
  // `@slay` and `slay`.
  instagram: z.string().trim()
    .transform((handle) => handle.replace(/^@/, ''))
    .pipe(z.string().regex(INSTAGRAM_HANDLE, 'Enter a valid Instagram ID, like @slayrunclub')),
  reason: z.string().trim()
    .min(SLAY_REASON_MIN, `Tell us a little more — at least ${SLAY_REASON_MIN} characters`)
    .max(SLAY_REASON_MAX, `Keep it under ${SLAY_REASON_MAX} characters`),
})

export type SlayApplication = z.infer<typeof slayApplicationSchema>
export type SlayApplicationField = keyof SlayApplication
