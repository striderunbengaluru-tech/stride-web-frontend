import { z } from 'zod'
import { MAX_FIELD_OPTIONS, isChoiceFieldType, type AdditionalField } from '@/types/event'

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

export const eventSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  subtitle: z.string().max(200).optional(),
  details: z.string().optional(),
  location: z.string().max(200).optional(),
  locationUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  postRunLocation: z.string().max(200).optional(),
  postRunLocationUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  stravaRouteUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  eventDate: z.string().optional(),
  endDate: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  distanceKm: z.coerce.number().positive().max(500).optional(),
  difficulty: z.string().max(60).optional(),
  // Admin enters the price in rupees with up to 2 decimals (e.g. 2000.50).
  // Stored as integer paise (price_paise) in the action — paise is the unit
  // Razorpay charges in and avoids floating-point money errors.
  priceRupees: z.coerce.number().min(0, 'Price cannot be negative').max(1_000_000, 'Price is too large').default(0),
  // Checkbox/switch posts 'true' | 'false' via a hidden input; absent = false
  showSpotsLeft: z.preprocess((v) => v === 'true' || v === 'on' || v === true, z.boolean()),
  // Staging-only event: never surfaced on the production deployment, whatever
  // its status. Used to exercise features against real data without the live
  // site showing it.
  isTestEvent: z.preprocess((v) => v === 'true' || v === 'on' || v === true, z.boolean()),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).default('DRAFT'),
  confirmationText: z.string().max(2000).optional(),
  termsText: z.string().max(5000).optional(),
  bannerImages: z.string().optional(), // JSON array of uploaded image URLs
  additionalFields: z.string().optional(), // JSON array of AdditionalField objects
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
