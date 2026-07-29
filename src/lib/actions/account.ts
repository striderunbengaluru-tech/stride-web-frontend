'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { hardDeleteUser, isLastAdmin } from '@/lib/account/hard-delete'

// Supabase keeps the session in `sb-<projectRef>-auth-token`, split into
// `.0`/`.1` chunks when it exceeds the cookie size limit, alongside a
// `-code-verifier` companion during OAuth. Matching on the prefix covers every
// variant without hard-coding the project ref, and touches nothing else: the
// app's own cookies are `stride_*`.
const SUPABASE_COOKIE_PREFIX = 'sb-'

/**
 * Expires every Supabase auth cookie on this browser.
 *
 * Deliberately independent of supabase-js. The previous implementation called
 * `supabase.auth.signOut()` *after* erasing the account, which is unreliable by
 * construction: signOut first resolves the current session, that resolution
 * refreshes an access token whose user no longer exists, the refresh fails, and
 * signOut returns early on the session error without ever clearing the cookies.
 * The browser stayed authenticated, and because middleware verifies the JWT
 * locally (getClaims, no network round trip) the deleted account still read as
 * signed in until the token expired.
 */
async function expireSupabaseCookies(): Promise<void> {
  const cookieStore = await cookies()
  for (const cookie of cookieStore.getAll()) {
    if (!cookie.name.startsWith(SUPABASE_COOKIE_PREFIX)) continue
    // Setting an empty value with maxAge 0 is the unambiguous expiry: it emits a
    // Set-Cookie the browser must honour, where delete() can silently miss if
    // the path doesn't match.
    cookieStore.set(cookie.name, '', { path: '/', maxAge: 0 })
  }
}

// Permanently erases the currently authenticated user (DPDP right to erasure):
// storage objects, their event registrations, the public.users row, and the
// auth.users credentials. Nothing is retained.
//
// Returns rather than redirects so the caller can also tear down the client-side
// session — this tab still holds a supabase-js client with the old session in
// memory and a cached nav profile in sessionStorage, neither of which a server
// redirect can reach.
//
// Failures are returned as { error } rather than thrown — Next.js masks thrown
// server-action error messages in production, and the last-admin guidance must
// reach the user verbatim.
export async function deleteAccountAction(): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // No live session. Either they were never signed in, or an earlier attempt
  // erased the auth user and left these cookies behind — clear them regardless,
  // which makes a half-finished deletion self-healing on retry.
  if (!user) {
    await expireSupabaseCookies()
    return { ok: true }
  }

  // The club must never be left without an administrator — the sole admin has
  // to hand over the role before their account can be erased.
  if (await isLastAdmin(user.id)) {
    return {
      error: 'You are the only admin. Promote another member to admin in Admin → Users before deleting your account.',
    }
  }

  const result = await hardDeleteUser(user.id)
  if (!result.ok) {
    // Nothing is expired here on purpose: the account still exists, so the
    // session must stay valid for a retry.
    return { error: 'Account deletion failed. Please try again or contact support.' }
  }

  await expireSupabaseCookies()
  return { ok: true }
}
