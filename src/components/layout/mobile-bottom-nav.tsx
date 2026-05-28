import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { MobileBottomNavClient } from './mobile-bottom-nav-client'

export default async function MobileBottomNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let navUser: { username: string; firstName: string; avatarUrl: string | null } | null = null

  if (user) {
    const { data: profile } = await adminClient
      .from('users')
      .select('username, full_name, avatar_url')
      .eq('id', user.id)
      .single()

    if (profile) {
      navUser = {
        username: profile.username ?? '',
        firstName: profile.full_name?.split(' ')[0] ?? profile.username ?? 'You',
        avatarUrl: profile.avatar_url ?? null,
      }
    }
  }

  return <MobileBottomNavClient navUser={navUser} />
}
