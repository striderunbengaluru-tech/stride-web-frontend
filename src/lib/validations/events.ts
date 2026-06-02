import { z } from 'zod'

// 10 or 11 digits, digits only — no spaces, letters, or symbols.
const phoneNumber = (label: string) =>
  z.string().trim().regex(/^\d{10,11}$/, `Enter a valid 10 or 11 digit ${label} (digits only)`)

export const participantDetailsSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date of birth'),
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
  customResponses: z.record(z.string(), z.union([z.string(), z.number()])).optional().default({}),
}).and(participantDetailsSchema)

export type RegisterEventInput = z.infer<typeof registerEventSchema>
export type ParticipantDetailsInput = z.infer<typeof participantDetailsSchema>
