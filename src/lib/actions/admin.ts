'use server'

import { redirect } from 'next/navigation'
import { revalidatePath, revalidateTag } from 'next/cache'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { EVENTS_TAG, eventTag } from '@/lib/data/events'
import { eventSchema, productSchema, additionalFieldSchema } from '@/lib/validations/admin'
import { slugify } from '@/lib/utils/slug'
import { isLastAdmin } from '@/lib/account/hard-delete'

// Validates the JSON-encoded additional fields string from the form.
// Returns a canonical JSON string ('[]' on any error) — never blocks the save.
// Entries are validated one at a time on purpose: parsing the array as a whole
// meant a single malformed question (e.g. a dropdown saved with no options)
// silently wiped every other question on the event.
function sanitiseAdditionalFields(raw: string | undefined): string {
  if (!raw) return '[]'
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return '[]'
    const clean = parsed.flatMap(entry => {
      const result = additionalFieldSchema.safeParse(entry)
      return result.success ? [result.data] : []
    })
    return JSON.stringify(clean)
  } catch { return '[]' }
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Always read role fresh from DB — JWT claims may hold stale values.
  const { data: row } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (row?.role !== 'ADMIN') redirect('/')
  return user
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function createEventAction(formData: FormData): Promise<void> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return

  const { name, eventDate, endDate, locationUrl, postRunLocation, postRunLocationUrl, stravaRouteUrl, priceRupees, confirmationText, termsText, bannerImages, additionalFields, distanceKm, difficulty, showSpotsLeft, isTestEvent, ...rest } = parsed.data
  const id = nanoid()
  const slug = slugify(name)

  const { data: existing } = await adminClient
    .from('events')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    redirect(`/admin/events/new?slug_error=${encodeURIComponent(`"${name}" is already taken — try a more specific name.`)}`)
  }

  await adminClient.from('events').insert({
    id,
    name,
    slug,
    event_date: eventDate ? new Date(eventDate).toISOString() : null,
    end_date: endDate ? new Date(endDate).toISOString() : null,
    location_url: locationUrl || null,
    post_run_location: postRunLocation?.trim() || null,
    post_run_location_url: postRunLocationUrl || null,
    strava_route_url: stravaRouteUrl || null,
    price_paise: Math.round(priceRupees * 100),
    confirmation_text: confirmationText || null,
    terms_and_conditions: termsText || null,
    banner_images: bannerImages ?? '[]',
    additional_fields: sanitiseAdditionalFields(additionalFields),
    distance_km: distanceKm ?? null,
    difficulty: difficulty?.trim() || null,
    show_spots_left: showSpotsLeft,
    is_test_event: isTestEvent,
    ...rest,
  })

  revalidateEventCaches(slug)
  redirect('/admin/events')
}

// Purge every cache layer that serves event data: the tag-cached reads in
// src/lib/data/events.ts and the ISR'd /events listing page.
function revalidateEventCaches(slug: string | null) {
  // 'max' = expire immediately (Next 16 requires an explicit cache profile)
  revalidateTag(EVENTS_TAG, 'max')
  if (slug) {
    revalidateTag(eventTag(slug), 'max')
    revalidatePath(`/events/${slug}`)
  }
  revalidatePath('/events')
}

export async function updateEventAction(id: string, formData: FormData): Promise<void> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return

  const { name, eventDate, endDate, locationUrl, postRunLocation, postRunLocationUrl, stravaRouteUrl, priceRupees, confirmationText, termsText, bannerImages, additionalFields, distanceKm, difficulty, showSpotsLeft, isTestEvent, ...rest } = parsed.data

  const { data: updated } = await adminClient.from('events').update({
    name,
    event_date: eventDate ? new Date(eventDate).toISOString() : null,
    end_date: endDate ? new Date(endDate).toISOString() : null,
    location_url: locationUrl || null,
    post_run_location: postRunLocation?.trim() || null,
    post_run_location_url: postRunLocationUrl || null,
    strava_route_url: stravaRouteUrl || null,
    price_paise: Math.round(priceRupees * 100),
    confirmation_text: confirmationText || null,
    terms_and_conditions: termsText || null,
    banner_images: bannerImages ?? '[]',
    additional_fields: sanitiseAdditionalFields(additionalFields),
    distance_km: distanceKm ?? null,
    difficulty: difficulty?.trim() || null,
    show_spots_left: showSpotsLeft,
    is_test_event: isTestEvent,
    updated_at: new Date().toISOString(),
    ...rest,
  }).eq('id', id).select('slug').single()

  revalidateEventCaches(updated?.slug ?? null)
  redirect('/admin/events')
}

const STORAGE_URL_PREFIX = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/'

export async function deleteEventAction(id: string): Promise<void> {
  await requireAdmin()

  // Fetch banner images (for storage cleanup) and slug (for cache purge)
  // before deleting the row
  const { data: event } = await adminClient
    .from('events')
    .select('banner_images, slug')
    .eq('id', id)
    .single()

  const bannerUrls: string[] = (() => {
    try { return JSON.parse(event?.banner_images ?? '[]') as string[] }
    catch { return [] }
  })()

  const storagePaths = bannerUrls
    .filter(url => url.startsWith(STORAGE_URL_PREFIX))
    .map(url => url.slice(STORAGE_URL_PREFIX.length))
    .filter(p => p.startsWith('images/events/'))

  if (storagePaths.length > 0) {
    await adminClient.storage.from('stride-assets').remove(storagePaths)
  }

  await adminClient.from('events').delete().eq('id', id)
  revalidateEventCaches(event?.slug ?? null)
  redirect('/admin/events')
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function createProductAction(formData: FormData): Promise<void> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) return

  const { pricePaise, imageUrl, ...rest } = parsed.data
  const id = nanoid()
  const slug = slugify(parsed.data.name)

  await adminClient.from('products').insert({
    id,
    slug,
    price_paise: pricePaise,
    image_url: imageUrl || null,
    ...rest,
  })

  redirect('/admin/products')
}

export async function updateProductAction(id: string, formData: FormData): Promise<void> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) return

  const { pricePaise, imageUrl, ...rest } = parsed.data

  await adminClient.from('products').update({
    price_paise: pricePaise,
    image_url: imageUrl || null,
    updated_at: new Date().toISOString(),
    ...rest,
  }).eq('id', id)

  redirect('/admin/products')
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireAdmin()
  await adminClient.from('products').delete().eq('id', id)
  redirect('/admin/products')
}

// ── Users ─────────────────────────────────────────────────────────────────────

// Returns { error } instead of throwing — Next.js masks thrown server-action
// error messages in production, and the last-admin refusal must be readable.
export async function updateUserRoleAction(userId: string, role: string): Promise<{ error: string } | void> {
  await requireAdmin()

  if (!['GUEST', 'MEMBER', 'ADMIN'].includes(role)) return

  // The club must always keep at least one administrator.
  if (role !== 'ADMIN' && await isLastAdmin(userId)) {
    return { error: 'This is the only admin account. Promote another member to admin before removing this one.' }
  }

  await adminClient.from('users').update({
    role,
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

  redirect('/admin/users')
}
