import { adminClient } from '@/lib/supabase/admin'

// Permanent, irreversible account erasure (DPDP right to erasure).
// Server-only: imports adminClient (service role). Shared by the profile
// "Delete account" server action and the inactivity-purge cron route.

const BUCKET = 'stride-assets'
const STORAGE_PUBLIC_PREFIX = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/'

export type HardDeleteResult = {
  /** true iff the public.users row and the auth user are both gone. */
  ok: boolean
  userId: string
  /** Non-fatal storage cleanup failures (files may be orphaned). */
  storageErrors: string[]
  fatalError?: string
}

// Removes every object under a storage folder (e.g. images/gallery/<id>).
async function removeStorageFolder(prefix: string, errors: string[]): Promise<void> {
  try {
    const { data: files, error } = await adminClient.storage.from(BUCKET).list(prefix, { limit: 1000 })
    if (error) {
      errors.push(`list ${prefix}: ${error.message}`)
      return
    }
    if (files && files.length > 0) {
      const paths = files.map(f => `${prefix}/${f.name}`)
      const { error: removeError } = await adminClient.storage.from(BUCKET).remove(paths)
      if (removeError) errors.push(`remove ${prefix}: ${removeError.message}`)
    }
  } catch (err) {
    errors.push(`sweep ${prefix}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// True when the user currently holds the ADMIN role and is the only one.
// Used to block self-deletion (and demotion) of the sole administrator —
// another member must be promoted first via /admin/users.
export async function isLastAdmin(userId: string): Promise<boolean> {
  const { data: row } = await adminClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  if (row?.role !== 'ADMIN') return false

  const { count } = await adminClient
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'ADMIN')
  return (count ?? 0) <= 1
}

export async function hardDeleteUser(userId: string): Promise<HardDeleteResult> {
  const storageErrors: string[] = []

  // ── 1. Storage sweep (best-effort — an orphaned file is recoverable, a
  //       half-deleted account is worse, so failures never abort the flow).
  //       Runs before the row delete: the avatar_url and namespaced paths are
  //       only derivable while the user row still exists.
  try {
    // Legacy/non-canonical avatar path referenced by the row (mirrors the
    // cleanup in the avatar upload route). Google-hosted URLs are external.
    const { data: row } = await adminClient
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single()
    const avatarUrl = row?.avatar_url
    if (avatarUrl?.startsWith(STORAGE_PUBLIC_PREFIX)) {
      const avatarPath = avatarUrl.slice(STORAGE_PUBLIC_PREFIX.length).split('?')[0]
      if (avatarPath.startsWith('images/avatars/') && avatarPath !== `images/avatars/${userId}.webp`) {
        const { error } = await adminClient.storage.from(BUCKET).remove([avatarPath])
        if (error) storageErrors.push(`remove ${avatarPath}: ${error.message}`)
      }
    }
  } catch (err) {
    storageErrors.push(`avatar lookup: ${err instanceof Error ? err.message : String(err)}`)
  }

  try {
    const { error } = await adminClient.storage.from(BUCKET).remove([
      `images/avatars/${userId}.webp`,
      `images/covers/${userId}.webp`,
    ])
    if (error) storageErrors.push(`remove avatar/cover: ${error.message}`)
  } catch (err) {
    storageErrors.push(`remove avatar/cover: ${err instanceof Error ? err.message : String(err)}`)
  }

  await removeStorageFolder(`images/gallery/${userId}`, storageErrors)
  await removeStorageFolder(`images/prompts/${userId}`, storageErrors)

  if (storageErrors.length > 0) {
    console.warn('[hardDeleteUser] storage cleanup issues', { userId, storageErrors })
  }

  // ── 2. Dependent rows, deleted explicitly. event_registrations.user_id is
  //       declared ON DELETE CASCADE, but an erasure guarantee must not rest on
  //       a constraint the app can't verify at runtime: if that cascade is ever
  //       dropped, the users delete below would fail on a foreign-key violation
  //       and the account would survive. Doing it here makes the guarantee the
  //       code's, and keeps the operation correct either way.
  const { error: regError } = await adminClient
    .from('event_registrations')
    .delete()
    .eq('user_id', userId)
  if (regError) {
    console.error('[hardDeleteUser] failed to delete registrations', { userId, regError })
    return { ok: false, userId, storageErrors, fatalError: `registrations delete: ${regError.message}` }
  }

  // ── 3. Delete the public.users row — every profile field, including the
  //       contact numbers and date of birth.
  const { error: dbError } = await adminClient.from('users').delete().eq('id', userId)
  if (dbError) {
    console.error('[hardDeleteUser] failed to delete users row', { userId, dbError })
    return { ok: false, userId, storageErrors, fatalError: `users delete: ${dbError.message}` }
  }

  // ── 4. Delete the auth.users record so the credentials are gone and the
  //       user can no longer sign in. This also drops their refresh tokens and
  //       sessions server-side, so no device can mint a new access token.
  //       "Not found" counts as success so the operation stays idempotent.
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId)
  if (authError && authError.status !== 404) {
    // The profile row is already gone (no PII survives); a re-login would
    // only recreate a fresh empty profile. Log loudly for follow-up.
    console.error('[hardDeleteUser] failed to delete auth user', { userId, authError })
    return { ok: false, userId, storageErrors, fatalError: `auth delete: ${authError.message}` }
  }

  return { ok: true, userId, storageErrors }
}
