'use server'

import { redirect } from 'next/navigation'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function signInWithGoogle() {
  const callbackURL = encodeURIComponent(`${SITE_URL}/auth/post-login`)
  redirect(`/api/auth/signin/google?callbackURL=${callbackURL}`)
}
