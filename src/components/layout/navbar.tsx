import Link from 'next/link';
import Image from 'next/image';

const NAV_LINKS = [
  { label: 'Events', href: '/events' },
  { label: 'Shop', href: '/shop' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Team', href: '/team' },
] as const;

const Navbar = () => {
  return (
    <div className='fixed top-4 left-0 right-0 z-50 flex justify-center px-4'>
      <nav
        aria-label='Main navigation'
        className='w-full max-w-6xl flex items-center justify-between gap-6 rounded-2xl border border-copy-white/10 bg-copy-black/30 px-5 py-2.5 backdrop-blur-xl'
      >
        {/* Logo */}
        <Link
          href='/'
          className='shrink-0'
          aria-label='Stride Run Club home'
        >
          <Image
            src='/assets/images/stride-logo-full.webp'
            alt='Stride Run Club'
            width={110}
            height={36}
            className='object-contain'
            priority
          />
        </Link>

        {/* Nav links — hidden on mobile */}
        <ul className='hidden md:flex items-center gap-7 list-none m-0 p-0'>
          {NAV_LINKS.map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                className='text-copy-white/70 hover:text-copy-white text-sm font-medium transition-colors duration-150'
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Auth actions */}
        <div className='flex items-center gap-3 shrink-0'>
          <Link
            href='/login'
            className='hidden sm:block text-copy-white/70 hover:text-copy-white text-sm font-medium transition-colors duration-150'
          >
            Login
          </Link>
          <Link
            href='/register'
            className='bg-stride-yellow-accent text-stride-purple-primary font-bold text-sm px-5 py-2 rounded-md hover:opacity-90 transition-opacity'
          >
            Register
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
