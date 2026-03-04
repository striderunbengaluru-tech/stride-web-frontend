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

  const { name, eventDate, endDate, locationUrl, stravaRouteUrl, pricePaise, coverUrl, ...rest } = parsed.data
  const id = nanoid()
  const slug = slugify(name)

  await adminClient.from('events').insert({
    id,
    name,
    slug,
    event_date: eventDate ? new Date(eventDate).toISOString() : null,
    end_date: endDate ? new Date(endDate).toISOString() : null,
    location_url: locationUrl || null,
    strava_route_url: stravaRouteUrl || null,
    price_paise: pricePaise,
    cover_url: coverUrl || null,
    ...rest,
  })

  redirect('/admin/events')
}

export async function updateEventAction(id: string, formData: FormData): Promise<void> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return

  const { name, eventDate, endDate, locationUrl, stravaRouteUrl, pricePaise, coverUrl, ...rest } = parsed.data

  await adminClient.from('events').update({
    name,
    event_date: eventDate ? new Date(eventDate).toISOString() : null,
    end_date: endDate ? new Date(endDate).toISOString() : null,
    location_url: locationUrl || null,
    strava_route_url: stravaRouteUrl || null,
    price_paise: pricePaise,
    cover_url: coverUrl || null,
    updated_at: new Date().toISOString(),
    ...rest,
  }).eq('id', id)

  redirect('/admin/events')
}

export async function deleteEventAction(id: string): Promise<void> {
  await requireAdmin()
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
