import Link from 'next/link';
import Image from 'next/image';

const FOOTER_LINKS = [
  { title: 'Team', href: '/team' },
  { title: 'Partnerships', href: '/partnerships' },
  { title: 'Stride Originals', href: '/originals/lake-hop-project' },
];

const InstagramIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor' className='size-6' aria-hidden='true'>
    <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' />
  </svg>
);

const StravaIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor' className='size-6' aria-hidden='true'>
    <path d='M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169' />
  </svg>
);

export default function Footer() {
  return (
    <footer className='px-4 pb-6 pt-2 md:pb-12 md:pt-6'>
      <div className='mx-auto max-w-5xl rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 px-8 py-10 md:py-14'>

        {/* Logo */}
        <Link href='/' aria-label='Stride Run Club home' className='mx-auto mb-6 block w-fit'>
          <Image
            src='https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.svg'
            alt='Stride Run Club'
            width={140}
            height={46}
            className='object-contain'
          />
        </Link>

        {/* Move as one tagline */}
        <p className='text-center font-libre font-bold text-stride-yellow-accent text-3xl md:text-4xl mb-3'>
          Move as one.
        </p>
        <p className='text-center text-copy-white/50 text-sm mb-10'>
          Bengaluru&apos;s community for runners of all paces.
        </p>

        {/* Social icons */}
        <div className='mb-10 flex justify-center gap-4'>
          <Link
            href='https://www.instagram.com/stride_runclub_bengaluru/'
            target='_blank'
            rel='noopener noreferrer'
            aria-label='Instagram'
            className='flex items-center justify-center size-12 rounded-full bg-white/10 border border-white/15 text-copy-white/70 hover:text-pink-500 hover:border-pink-500/40 hover:bg-pink-500/10 transition-all duration-200'
          >
            <InstagramIcon />
          </Link>
          <Link
            href='https://strava.app.link/eFnB8k3rw2b'
            target='_blank'
            rel='noopener noreferrer'
            aria-label='Strava'
            className='flex items-center justify-center size-12 rounded-full bg-white/10 border border-white/15 text-copy-white/70 hover:text-orange-500 hover:border-orange-500/40 hover:bg-orange-500/10 transition-all duration-200'
          >
            <StravaIcon />
          </Link>
        </div>

        {/* Nav links */}
        <nav className='mb-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm' aria-label='Footer navigation'>
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className='text-copy-white/60 hover:text-stride-yellow-accent transition-colors duration-150'
            >
              {link.title}
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div className='border-t border-white/10 pt-6'>
          <p className='text-center text-copy-white/30 text-xs'>
            &copy; {new Date().getFullYear()} Stride Run Club, Bengaluru. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
