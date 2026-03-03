import { z } from 'zod'

export const eventSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  subtitle: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  details: z.string().optional(),
  location: z.string().max(200).optional(),
  locationUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  stravaRouteUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  eventDate: z.string().optional(),
  endDate: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  pricePaise: z.coerce.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).default('DRAFT'),
  coverUrl: z.string().optional(),
})

export type EventFormData = z.infer<typeof eventSchema>

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  pricePaise: z.coerce.number().int().positive('Price must be greater than 0'),
  stock: z.coerce.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  imageUrl: z.string().optional(),
})

export type ProductFormData = z.infer<typeof productSchema>
