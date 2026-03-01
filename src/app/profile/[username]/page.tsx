import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LogOut } from 'lucide-react'
import type { Metadata } from 'next'
import type { UserProfile } from '@/types/user'
import { ROLES } from '@/types/auth'
import { signOut } from '@/lib/auth/actions'

type Props = {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return {
    title: `@${username} — Stride Run Club`,
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('users')
    .select('id, username, full_name, bio, role, avatar_url, created_at')
    .eq('username', username)
    .single<UserProfile>()

  if (!profile) notFound()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const isOwnProfile = currentUser?.id === profile.id
  const joinedYear = new Date(profile.created_at).getFullYear()

  return (
    <main className='min-h-screen bg-stride-purple-primary pt-28 pb-16 px-4'>
      <div className='max-w-2xl mx-auto'>
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-8 hover:border-stride-yellow-accent/50 transition-colors'>
          {/* Avatar + name */}
          <div className='flex flex-col sm:flex-row items-center sm:items-start gap-6'>
            <div className='shrink-0'>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? profile.username}
                  width={96}
                  height={96}
                  loading='lazy'
                  fetchPriority='low'
                  className='rounded-full object-cover w-24 h-24'
                />
              ) : (
                <div className='w-24 h-24 rounded-full bg-stride-yellow-accent/20 border border-stride-yellow-accent/40 flex items-center justify-center'>
                  <span className='text-stride-yellow-accent text-3xl font-bold'>
                    {(profile.full_name ?? profile.username)
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className='flex-1 text-center sm:text-left'>
              <div className='flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start'>
                <h1 className='text-2xl font-bold text-white'>
                  {profile.full_name ?? profile.username}
                </h1>
                <RoleBadge role={profile.role} />
              </div>
              <p className='text-white/50 text-sm mt-1'>@{profile.username}</p>
              <p className='text-white/40 text-xs mt-1'>
                Member since {joinedYear}
              </p>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className='mt-6 pt-6 border-t border-white/10'>
              <p className='text-white/70 text-sm leading-relaxed line-clamp-4'>
                {profile.bio}
              </p>
            </div>
          )}

          {/* Own profile actions */}
          {isOwnProfile && (
            <div className='mt-6 pt-6 border-t border-white/10 flex gap-3'>
              <form action={signOut}>
                <button
                  type='submit'
                  className='flex items-center gap-2 text-white/50 hover:text-white text-sm font-medium transition-colors min-h-11 px-4 rounded-md border border-white/15 hover:border-white/30'
                >
                  <LogOut size={15} aria-hidden='true' />
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function RoleBadge({ role }: { role: UserProfile['role'] }) {
  if (role === ROLES.GUEST) return null

  const styles =
    role === ROLES.ADMIN
      ? 'bg-stride-yellow-accent/20 text-stride-yellow-accent border-stride-yellow-accent/40'
      : 'bg-white/10 text-white/70 border-white/20'

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles}`}
    >
      {role}
    </span>
  )
}
