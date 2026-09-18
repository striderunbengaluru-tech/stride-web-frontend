'use server'

import { redirect } from 'next/navigation'
import { revalidatePath, updateTag } from 'next/cache'
import { nanoid } from 'nanoid'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/actions/require-admin'
import { firstFormIssue } from '@/lib/utils/form-issues'
import { storagePathsUnder } from '@/lib/utils/storage-paths'
import { raceSchema, RACE_FIELD_ORDER, type RaceActionResult, type RaceFormData } from '@/lib/validations/admin'
import { RACES_TAG, raceTag } from '@/lib/data/races'
import { slugify } from '@/lib/utils/slug'
import { istLocalToUtcIso } from '@/lib/utils/ist'

const ADMIN_RACES_PATH = '/admin/race-calendar'
const PUBLIC_RACES_PATH = '/race-calendar'
const UNIQUE_VIOLATION = '23505'
const MIDNIGHT = '00:00'

/** Postgres unique-constraint failure — the slug pre-check lost a race. */
function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === UNIQUE_VIOLATION
}

function takenError(name: string): RaceActionResult {
  return { error: `"${name}" is already taken — try a more specific name.`, field: 'name' }
}

/**
 * Form data → row columns. Arrays go in as plain JS arrays (text[] columns);
 * the IST wall clock the admin typed becomes a UTC instant. updated_at is left
 * to the database trigger.
 */
function raceColumns(data: RaceFormData) {
  return {
    name: data.name,
    description: data.description?.trim() || null,
    poster_images: data.posterImages,
    // A blank start time is stored as midnight IST so the row still sorts on
    // race day; has_start_time tells the UI to show the date only.
    race_date: istLocalToUtcIso(`${data.raceDate}T${data.startTime ?? MIDNIGHT}`),
    has_start_time: Boolean(data.startTime),
    city: data.city,
    venue: data.venue?.trim() || null,
    organizer: data.organizer?.trim() || null,
    distances: data.distances,
    registration_url: data.registrationUrl ?? null,
    coupon_code: data.couponCode ?? null,
    discount_percent: data.couponCode ? data.discountPercent ?? null : null,
    registration_deadline: istLocalToUtcIso(data.registrationDeadline),
    status: data.status,
  }
}

// updateTag rather than revalidateTag(tag, 'max') — see revalidateEventCaches
// in ./admin.ts for why the stale-while-revalidate profile hid admin edits.
function revalidateRaceCaches(slug: string | null) {
  updateTag(RACES_TAG)
  if (slug) {
    updateTag(raceTag(slug))
    revalidatePath(`${PUBLIC_RACES_PATH}/${slug}`)
  }
  revalidatePath(PUBLIC_RACES_PATH)
}

// Signature note: `_prev` is useActionState's previous-state argument, so a
// rejection reaches the form as returned state and the admin keeps their input.
export async function createRaceAction(_prev: RaceActionResult, formData: FormData): Promise<RaceActionResult> {
  const { actorName } = await requireAdmin()

  const parsed = raceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return firstFormIssue(parsed.error.issues, RACE_FIELD_ORDER)

  const slug = slugify(parsed.data.name)

  const { data: existing } = await adminClient
    .from('races')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return takenError(parsed.data.name)

  const { error } = await adminClient.from('races').insert({
    id: nanoid(),
    slug,
    ...raceColumns(parsed.data),
    created_by: actorName,
    updated_by: actorName,
  })
  if (isUniqueViolation(error)) return takenError(parsed.data.name)
  if (error) {
    console.error('[createRaceAction]', error)
    return { error: 'Could not save the race. Please try again.' }
  }

  revalidateRaceCaches(slug)
  redirect(ADMIN_RACES_PATH)
}

/** The slug is fixed at creation — renaming a race never breaks a shared link. */
export async function updateRaceAction(id: string, _prev: RaceActionResult, formData: FormData): Promise<RaceActionResult> {
  const { actorName } = await requireAdmin()

  const parsed = raceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return firstFormIssue(parsed.error.issues, RACE_FIELD_ORDER)

  const { data: updated, error } = await adminClient
    .from('races')
    .update({ ...raceColumns(parsed.data), updated_by: actorName })
    .eq('id', id)
    .select('slug')
    .single()
  if (error) {
    console.error('[updateRaceAction]', error)
    return { error: 'Could not save the race. Please try again.' }
  }

  revalidateRaceCaches(updated?.slug ?? null)
  redirect(ADMIN_RACES_PATH)
}

export async function deleteRaceAction(id: string): Promise<void> {
  await requireAdmin()

  const { data: race } = await adminClient
    .from('races')
    .select('poster_images, slug')
    .eq('id', id)
    .single()

  // Only paths under images/races/ — a race row can never remove an event banner.
  const storagePaths = storagePathsUnder('race', (race?.poster_images as string[] | null) ?? [])
  if (storagePaths.length > 0) {
    await adminClient.storage.from('stride-assets').remove(storagePaths)
  }

  await adminClient.from('races').delete().eq('id', id)
  revalidateRaceCaches(race?.slug ?? null)
  redirect(ADMIN_RACES_PATH)
}
