'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hardDeleteUser, isLastAdmin } from '@/lib/account/hard-delete'

// Permanently erases the currently authenticated user (DPDP right to erasure):
// storage objects, the public.users row (cascading event_registrations), and
// the auth.users credentials. Nothing is retained.
//
// Failures are returned as { error } rather than thrown — Next.js masks thrown
// server-action error messages in production, and the last-admin guidance must
// reach the user verbatim.
export async function deleteAccountAction(): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/become-a-member')
  }
  const userId = user!.id

  // The club must never be left without an administrator — the sole admin has
  // to hand over the role before their account can be erased.
  if (await isLastAdmin(userId)) {
    return {
      error: 'You are the only admin. Promote another member to admin in Admin → Users before deleting your account.',
    }
  }

  const result = await hardDeleteUser(userId)
  if (!result.ok) {
    return { error: 'Account deletion failed. Please try again or contact support.' }
  }

  // The auth user no longer exists, so signOut may 4xx — still attempt it to
  // clear the local session cookies before redirecting.
  try {
    await supabase.auth.signOut()
  } catch {
    // Session cookies are invalid either way; the redirect completes sign-out.
  }
  redirect('/')
}
