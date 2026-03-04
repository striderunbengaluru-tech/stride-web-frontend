import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

// Supabase redirects here after Google OAuth completes (PKCE flow).
// Exchange the one-time code for a session, then forward to the user's profile.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Use adminClient to bypass RLS — the user row may not exist yet if the
        // trigger fired but the session client's RLS view hasn't caught up.
        let { data: profile } = await adminClient
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()

        // Fallback: trigger may have failed silently — create the row now.
        if (!profile) {
          const base = (user.email ?? '')
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_') || `user_${user.id.slice(0, 8)}`

          // Find a unique username
          let username = base
          let suffix = 0
          while (true) {
            const { count } = await adminClient
              .from('users')
              .select('id', { count: 'exact', head: true })
              .eq('username', username)
            if (!count) break
            suffix++
            username = `${base}_${suffix}`
          }

          const { data: upserted } = await adminClient
            .from('users')
            .upsert(
              {
                id: user.id,
                email: user.email,
                username,
                full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
                avatar_url: user.user_metadata?.avatar_url ?? null,
                role: 'GUEST',
              },
              { onConflict: 'id' }
            )
            .select('username')
            .single()

          profile = upserted
        }

        if (profile?.username) {
          return NextResponse.redirect(`${origin}/profile/${profile.username}`)
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/`)
}
