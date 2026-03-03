import { z } from 'zod'

export const registerEventSchema = z.object({
  eventId: z.string().min(1),
})

export type RegisterEventInput = z.infer<typeof registerEventSchema>
