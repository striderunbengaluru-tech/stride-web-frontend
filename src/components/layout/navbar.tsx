import Link from 'next/link'
import NavLinks from './nav-links'
import { NavbarLogo } from './navbar-logo'
import { NavbarAuth } from './navbar-auth'
import { HideOnAdminRoute } from './navbar-gate'

// Sync server component — no cookies()/auth here. The auth-dependent corner
// is the <NavbarAuth /> client island, which keeps the root layout (and
// therefore every public page) statically prerenderable.
const Navbar = () => {
  return (
    <div className='fixed top-0 left-0 right-0 z-50'>
      {/* The admin layout adds its own glassmorphic strip behind the navbar.
          On public pages the floating pill stands on its own. */}
      <div className='relative pt-4 flex justify-center px-4'>
      <nav
        aria-label='Main navigation'
        className='relative w-full max-w-6xl min-h-[60px] flex items-center justify-between gap-6 rounded-2xl border border-copy-white/10 bg-copy-black/30 px-5 py-3 backdrop-blur-xl'
      >
        {/* Logo — centered on mobile, left on sm+. Centered via inset-x + mx-auto
            (layout, pixel-snapped) instead of left-1/2 -translate-x-1/2: the
            composited transform lands on half-pixel offsets when the nav width
            is odd, which rasterizes the SVG blurry on mobile. */}
        <Link
          href='/'
          className='absolute inset-0 mx-auto w-fit flex items-center sm:static sm:mx-0 sm:w-auto shrink-0'
          aria-label='Stride Run Club home'
        >
          <NavbarLogo />
        </Link>

        {/* Nav links — hidden on admin routes (kept simple there) */}
        <HideOnAdminRoute>
          <NavLinks />
        </HideOnAdminRoute>

        {/* Auth corner — user menu or logged-out CTAs, resolved client-side */}
        <div className='flex items-center gap-3 shrink-0 ml-auto sm:ml-0'>
          <NavbarAuth />
        </div>
      </nav>
      </div>
    </div>
  )
}

export default Navbar
