import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import UserMenu from './user-menu'
import NavLinks from './nav-links'

const Navbar = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let navUser: { username: string; firstName: string; avatarUrl: string | null } | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('username, full_name, avatar_url')
      .eq('id', user.id)
      .single()

    if (profile) {
      navUser = {
        username: profile.username ?? user.id,
        firstName: profile.full_name?.split(' ')[0] ?? profile.username ?? 'You',
        avatarUrl: profile.avatar_url ?? null,
      }
    }
  }

  return (
    <div className='fixed top-4 left-0 right-0 z-50 flex justify-center px-4'>
      <nav
        aria-label='Main navigation'
        className='w-full max-w-6xl flex items-center justify-between gap-6 rounded-2xl border border-copy-white/10 bg-copy-black/30 px-5 py-3 backdrop-blur-xl'
      >
        {/* Logo */}
        <Link
          href='/'
          className='shrink-0'
          aria-label='Stride Run Club home'
        >
          <Image
            src='https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.svg'
            alt='Stride Run Club'
            width={110}
            height={36}
            className='object-contain'
            priority
          />
        </Link>

        {/* Nav links — hidden on mobile, active state managed client-side */}
        <NavLinks />

        {/* Auth actions */}
        <div className='flex items-center gap-3 shrink-0'>
          {navUser ? (
            <UserMenu
              username={navUser.username}
              firstName={navUser.firstName}
              avatarUrl={navUser.avatarUrl}
            />
          ) : (
            <>
              <Link
                href='/login'
                className='hidden sm:block text-copy-white/70 hover:text-copy-white text-sm font-medium transition-colors duration-150'
              >
                Login
              </Link>
              <Link
                href='/register'
                className='bg-stride-yellow-accent text-stride-dark font-bold text-sm px-5 py-2 rounded-md hover:opacity-90 transition-opacity'
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  )
}

export default Navbar
