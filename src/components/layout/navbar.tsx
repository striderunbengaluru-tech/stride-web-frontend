import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import UserMenu from './user-menu'
import NavLinks from './nav-links'
import { HideOnAdminRoute } from './navbar-gate'

const Navbar = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let navUser: {
    username: string
    firstName: string
    avatarUrl: string | null
    isAdmin: boolean
    email: string | null
  } | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('username, full_name, avatar_url, role')
      .eq('id', user.id)
      .single()

    if (profile) {
      navUser = {
        username: profile.username ?? user.id,
        firstName: profile.full_name?.split(' ')[0] ?? profile.username ?? 'You',
        avatarUrl: profile.avatar_url ?? null,
        isAdmin: profile.role === 'ADMIN',
        email: user.email ?? null,
      }
    }
  }

  return (
    <div className='fixed top-0 left-0 right-0 z-50'>
      {/* The admin layout adds its own glassmorphic strip behind the navbar.
          On public pages the floating pill stands on its own. */}
      <div className='relative pt-4 flex justify-center px-4'>
      <nav
        aria-label='Main navigation'
        className='relative w-full max-w-6xl min-h-[60px] flex items-center justify-between gap-6 rounded-2xl border border-copy-white/10 bg-copy-black/30 px-5 py-3 backdrop-blur-xl'
      >
        {/* Logo — centered on mobile, left on sm+ */}
        <Link
          href='/'
          className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:static sm:left-auto sm:top-auto sm:translate-x-0 sm:translate-y-0 shrink-0'
          aria-label='Stride Run Club home'
        >
          <Image
            src='https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.svg'
            alt='Stride Run Club'
            width={110}
            height={36}
            className='object-contain'
            priority
            unoptimized
          />
        </Link>

        {/* Nav links — hidden on admin routes (kept simple there) */}
        <HideOnAdminRoute>
          <NavLinks />
        </HideOnAdminRoute>

        {/* Auth actions + Partner CTA — Partner CTA hidden once logged in
            AND hidden on admin routes; user menu always shows */}
        <div className='flex items-center gap-3 shrink-0 ml-auto sm:ml-0'>
          {!navUser && (
            <HideOnAdminRoute>
              <Link
                href='/partnerships'
                className='hidden md:inline-flex items-center bg-stride-yellow-accent text-copy-black font-bold px-4 py-2 rounded-md text-sm hover:scale-[1.03] hover:shadow-lg hover:shadow-stride-yellow-accent/25 active:scale-[0.97] transition-all duration-150'
              >
                Partner With Us
              </Link>
            </HideOnAdminRoute>
          )}
          {navUser ? (
            <UserMenu
              username={navUser.username}
              firstName={navUser.firstName}
              avatarUrl={navUser.avatarUrl}
              isAdmin={navUser.isAdmin}
              email={navUser.email}
            />
          ) : null}
        </div>
      </nav>
      </div>
    </div>
  )
}

export default Navbar
