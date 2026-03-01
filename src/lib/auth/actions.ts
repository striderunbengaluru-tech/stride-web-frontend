'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headerStore = await headers()

  // Prefer an explicit site URL env var; fall back to the request origin.
  // NEXT_PUBLIC_SITE_URL must be set in Vercel env vars to the production URL.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    headerStore.get('origin') ??
    'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    console.error('[signInWithGoogle] OAuth initiation failed:', error.message)
    redirect('/login?error=oauth_failed')
  }

  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
