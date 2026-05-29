'use server'

import { redirect } from 'next/navigation'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { eventSchema, productSchema } from '@/lib/validations/admin'

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

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function createEventAction(formData: FormData): Promise<void> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return

  const { name, eventDate, endDate, locationUrl, postRunLocationUrl, stravaRouteUrl, pricePaise, confirmationText, bannerImages, ...rest } = parsed.data
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
    post_run_location_url: postRunLocationUrl || null,
    strava_route_url: stravaRouteUrl || null,
    price_paise: pricePaise,
    confirmation_text: confirmationText || null,
    banner_images: bannerImages ?? '[]',
    ...rest,
  })

  redirect('/admin/events')
}

export async function updateEventAction(id: string, formData: FormData): Promise<void> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return

  const { name, eventDate, endDate, locationUrl, postRunLocationUrl, stravaRouteUrl, pricePaise, confirmationText, bannerImages, ...rest } = parsed.data

  await adminClient.from('events').update({
    name,
    event_date: eventDate ? new Date(eventDate).toISOString() : null,
    end_date: endDate ? new Date(endDate).toISOString() : null,
    location_url: locationUrl || null,
    post_run_location_url: postRunLocationUrl || null,
    strava_route_url: stravaRouteUrl || null,
    price_paise: pricePaise,
    confirmation_text: confirmationText || null,
    banner_images: bannerImages ?? '[]',
    updated_at: new Date().toISOString(),
    ...rest,
  }).eq('id', id)

  redirect('/admin/events')
}

const STORAGE_URL_PREFIX = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/'

export async function deleteEventAction(id: string): Promise<void> {
  await requireAdmin()

  // Fetch banner images before deleting the row so we can clean up storage
  const { data: event } = await adminClient
    .from('events')
    .select('banner_images')
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

export async function updateUserRoleAction(userId: string, role: string): Promise<void> {
  await requireAdmin()

  if (!['GUEST', 'MEMBER', 'ADMIN'].includes(role)) return

  await adminClient.from('users').update({
    role,
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

  redirect('/admin/users')
}
