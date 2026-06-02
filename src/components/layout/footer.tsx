import Link from 'next/link'
import Image from 'next/image'
import { PREVIEW_FEATURES_ENABLED } from '@/lib/feature-flags'

// Events and Become-a-Member are gated to non-production deployments — drop them
// from the footer wherever the routes 404 (i.e. on the live site).
const EXPLORE_LINKS = [
  ...(PREVIEW_FEATURES_ENABLED ? [{ title: 'Events', href: '/events' }] : []),
  { title: 'Blog',         href: '/blog' },
  { title: 'Partnerships', href: '/partnerships' },
]

const ACCOUNT_LINKS = PREVIEW_FEATURES_ENABLED
  ? [{ title: 'Become a Member', href: '/become-a-member' }]
  : []

const LEGAL_LINKS = [
  { title: 'Privacy Policy',    href: '/privacy-policy' },
  { title: 'Terms of Service',  href: '/terms-of-service' },
  { title: 'Contact Us',        href: '/contact-us' },
]

const INSTAGRAM_URL = 'https://www.instagram.com/stride_runclub_bengaluru/'
const STRAVA_URL    = 'https://strava.app.link/eFnB8k3rw2b'

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden='true'>
    <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' />
  </svg>
)

const StravaIcon = ({ className }: { className?: string }) => (
  <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden='true'>
    <path d='M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169' />
  </svg>
)

type ColumnProps = { title: string; links: { title: string; href: string }[] }

function Column({ title, links }: ColumnProps) {
  return (
    <nav aria-label={`${title} links`} className='flex flex-col gap-3.5'>
      <p className='text-[10px] uppercase tracking-[0.25em] text-stride-yellow-accent/70 font-roboto'>
        {title}
      </p>
      <ul className='flex flex-col gap-3'>
        {links.map(link => (
          <li key={link.href}>
            <Link
              href={link.href}
              className='text-white/55 text-sm hover:text-stride-yellow-accent transition-colors duration-150 font-roboto inline-block'
            >
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function Footer() {
  return (
    <footer className='px-4 pb-8 pt-4 md:pb-14 md:pt-6'>
      <div className='mx-auto max-w-6xl rounded-2xl bg-white/5 border border-white/10 px-6 py-10 sm:px-10 sm:py-12 md:px-14 md:py-14'>

        {/* ── Top ── brand block + link columns ── */}
        <div className='flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-16'>

          {/* Brand */}
          <div className='flex flex-col gap-5 md:max-w-xs'>
            <Link href='/' aria-label='Stride Run Club home' className='block w-fit'>
              <Image
                src='https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.svg'
                alt='Stride Run Club'
                width={120}
                height={40}
                className='object-contain'
              />
            </Link>
            <p className='text-white/55 text-sm leading-relaxed font-roboto'>
              Bengaluru&apos;s community for runners of every pace — events, training, and a whole lot of miles.
            </p>
            {/* Social — visible on every screen size, grouped with brand */}
            <div className='flex items-center gap-5 pt-1'>
              <Link
                href={INSTAGRAM_URL}
                target='_blank'
                rel='noopener noreferrer'
                aria-label='Instagram'
                className='text-white/40 hover:text-pink-400 transition-colors duration-150'
              >
                <InstagramIcon className='size-5' />
              </Link>
              <Link
                href={STRAVA_URL}
                target='_blank'
                rel='noopener noreferrer'
                aria-label='Strava'
                className='text-white/40 hover:text-orange-400 transition-colors duration-150'
              >
                <StravaIcon className='size-5' />
              </Link>
            </div>
          </div>

          {/* ── Link columns ── 1 col mobile, 3 col tablet+ ── */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-x-12 gap-y-10 md:gap-x-16'>
            <Column title='Explore' links={EXPLORE_LINKS} />
            {ACCOUNT_LINKS.length > 0 && <Column title='Account' links={ACCOUNT_LINKS} />}
            <Column title='Legal'   links={LEGAL_LINKS} />
          </div>
        </div>

        {/* ── Bottom bar — tagline + copyright ── */}
        <div className='mt-12 pt-8 border-t border-white/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4'>
          <p className='text-white/30 text-xs font-roboto'>
            &copy; {new Date().getFullYear()} Stride Run Club, Bengaluru
          </p>
          <p className='font-libre font-bold text-stride-yellow-accent text-xl tracking-tight'>
            Move as One.
          </p>
        </div>

      </div>
    </footer>
  )
}
