import { z } from 'zod'

export const participantDetailsSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date of birth'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  contactNumber: z.string().trim().min(7, 'Enter a valid contact number'),
  emergencyContactNumber: z.string().trim().min(7, 'Enter a valid emergency contact number'),
})

export const registerEventSchema = z.object({
  eventId: z.string().min(1),
  customResponses: z.record(z.string(), z.union([z.string(), z.number()])).optional().default({}),
}).merge(participantDetailsSchema)

export type RegisterEventInput = z.infer<typeof registerEventSchema>
export type ParticipantDetailsInput = z.infer<typeof participantDetailsSchema>
