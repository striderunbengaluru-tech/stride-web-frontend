import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
        const { data: profile } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()

        if (profile?.username) {
          return NextResponse.redirect(`${origin}/profile/${profile.username}`)
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/`)
}
