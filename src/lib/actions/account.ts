'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

const BUCKET = 'stride-assets'

// Permanently deactivates the currently authenticated user.
//
// We keep the row in `public.users` so foreign keys (especially
// `event_registrations.user_id`) remain intact — admins can still see "this
// person attended these runs" with the user shown in a deactivated state.
// All PII (name, email, phone, DOB, gender, avatar, cover, gallery, bio,
// social links, runner tag, location) is wiped, and the auth.users record
// is removed so the user can't log back in.
export async function deleteAccountAction(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/become-a-member')
  }
  const userId = user!.id

  // ── 1. Wipe storage objects under the user's namespaced paths ──
  try {
    const fixedPaths = [
      `images/avatars/${userId}.webp`,
      `images/covers/${userId}.webp`,
    ]
    await adminClient.storage.from(BUCKET).remove(fixedPaths)
  } catch (err) {
    console.warn('[deleteAccount] avatar/cover removal failed', err)
  }

  try {
    const galleryPrefix = `images/gallery/${userId}`
    const { data: galleryFiles } = await adminClient.storage.from(BUCKET).list(galleryPrefix, { limit: 1000 })
    if (galleryFiles && galleryFiles.length > 0) {
      const paths = galleryFiles.map(f => `${galleryPrefix}/${f.name}`)
      await adminClient.storage.from(BUCKET).remove(paths)
    }
  } catch (err) {
    console.warn('[deleteAccount] gallery removal failed', err)
  }

  // ── 2. Anonymize the public.users row (keep id + runs_completed + created_at) ──
  //
  //    Anonymizing username with a `deleted_<prefix>` placeholder keeps the
  //    UNIQUE constraint happy and stops the soft-deleted row from squatting
  //    on a desirable handle for future signups.
  const anonUsername = `deleted_${userId.slice(0, 8)}`
  const { error: dbError } = await adminClient
    .from('users')
    .update({
      deleted_at: new Date().toISOString(),
      full_name: null,
      email: null,
      username: anonUsername,
      avatar_url: null,
      cover_url: null,
      bio: null,
      location: null,
      skills: '[]',
      linkedin_url: null,
      instagram_url: null,
      strava_url: null,
      prompts: '[]',
      gallery_images: '[]',
      runner_tag: null,
      contact_number: null,
      emergency_contact_number: null,
      date_of_birth: null,
      gender: null,
      role: 'GUEST',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
  if (dbError) {
    console.error('[deleteAccount] failed to anonymize users row', dbError)
    throw new Error('Account deletion failed. Please try again or contact support.')
  }

  // ── 3. Delete the auth.users record so the user can't log back in.
  //      Past event_registrations stay linked to the now-anonymized public.users
  //      row, so admin dashboards can still show "deactivated runner attended X".
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId)
  if (authError) {
    console.error('[deleteAccount] failed to delete auth.users record', authError)
    // public.users is already anonymized — proceed with sign-out so the user isn't stuck.
  }

  // ── 4. Sign out the current session and redirect ──
  await supabase.auth.signOut()
  redirect('/')
}
