'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { events, products, user as userTable } from '@/lib/db/schema'
import { eventSchema, productSchema } from '@/lib/validations/admin'

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/')

  // Always read role fresh from DB — cookieCache may hold a stale value
  const [row] = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1)

  if (row?.role !== 'ADMIN') redirect('/')
  return session
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
  if (!parsed.success) return // Validation failure: silent; page re-renders with original values

  const { name, eventDate, endDate, ...rest } = parsed.data
  const id = nanoid()
  const slug = slugify(name)

  await db.insert(events).values({
    id,
    name,
    slug,
    eventDate: eventDate ? new Date(eventDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    ...rest,
  })

  redirect('/admin/events')
}

export async function updateEventAction(id: string, formData: FormData): Promise<void> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return

  const { name, eventDate, endDate, ...rest } = parsed.data

  await db
    .update(events)
    .set({
      name,
      eventDate: eventDate ? new Date(eventDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      updatedAt: new Date(),
      ...rest,
    })
    .where(eq(events.id, id))

  redirect('/admin/events')
}

export async function deleteEventAction(id: string): Promise<void> {
  await requireAdmin()
  await db.delete(events).where(eq(events.id, id))
  redirect('/admin/events')
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function createProductAction(formData: FormData): Promise<void> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) return

  const id = nanoid()
  const slug = slugify(parsed.data.name)

  await db.insert(products).values({ id, slug, ...parsed.data })
  redirect('/admin/products')
}

export async function updateProductAction(id: string, formData: FormData): Promise<void> {
  await requireAdmin()

  const raw = Object.fromEntries(formData)
  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) return

  await db
    .update(products)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(products.id, id))

  redirect('/admin/products')
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireAdmin()
  await db.delete(products).where(eq(products.id, id))
  redirect('/admin/products')
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function updateUserRoleAction(userId: string, role: string): Promise<void> {
  await requireAdmin()

  if (!['GUEST', 'MEMBER', 'ADMIN'].includes(role)) return

  await db
    .update(userTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(userTable.id, userId))

  redirect('/admin/users')
}
