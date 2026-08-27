import Link from 'next/link'
import Image from 'next/image'
import { InstagramIcon, StravaIcon } from '@/components/ui/brand-icons'
import { NavLoadingLink } from './nav-loading-link'
import { FooterAccountColumn } from './footer-account-column'

// Every public page worth discovering. Deliberately absent: `/shop` (hidden by
// request) and `/originals` (no index route, only `/originals/[slug]`).
const EXPLORE_LINKS = [
  { title: 'Events',        href: '/events' },
  { title: 'Pricing',       href: '/pricing' },
  { title: 'About',         href: '/about' },
  { title: 'Milestones',    href: '/milestones' },
  { title: 'Leaderboard',   href: '/leaderboard' },
  { title: 'Blog',          href: '/blog' },
  { title: 'Originals',     href: '/originals' },
  { title: 'Team',          href: '/team' },
  { title: 'Partnerships',  href: '/partnerships' },
]

const LEGAL_LINKS = [
  { title: 'Privacy Policy',    href: '/privacy-policy' },
  { title: 'Terms of Service',  href: '/terms-of-service' },
  { title: 'Contact Us',        href: '/contact-us' },
]

const INSTAGRAM_URL = 'https://www.instagram.com/stride_runclub_bengaluru/'
const STRAVA_URL    = 'https://strava.app.link/eFnB8k3rw2b'

type ColumnProps = { title: string; links: { title: string; href: string }[] }

function Column({ title, links }: ColumnProps) {
  return (
    <nav aria-label={`${title} links`} className='flex flex-col gap-3.5'>
      <p className='text-[10px] font-mono uppercase tracking-[0.25em] text-stride-yellow-accent'>
        {title}
      </p>
      <ul className='flex flex-col gap-3'>
        {links.map(link => (
          <li key={link.href}>
            <NavLoadingLink
              href={link.href}
              className='text-white/70 text-sm hover:text-stride-yellow-accent transition-colors duration-150 font-figtree inline-block'
            >
              {link.title}
            </NavLoadingLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Sync server component — the auth-dependent Account column is a client
// island (FooterAccountColumn) so the footer never forces dynamic rendering.
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
                src='https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.png'
                alt='Stride Run Club'
                width={120}
                height={40}
                className='object-contain'
              />
            </Link>
            <p className='text-white/70 text-sm leading-relaxed font-figtree'>
              Bengaluru&apos;s running community for every pace. Events, group runs, and training.
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
            {/* Secure-payments trust badge — external asset from Razorpay's CDN */}
            <a
              href='https://razorpay.com/'
              target='_blank'
              rel='noopener noreferrer'
              aria-label='Payments secured by Razorpay'
              className='inline-block w-fit pt-1'
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                referrerPolicy='origin'
                src='https://badges.razorpay.com/badge-light.png'
                alt='Razorpay | Payment Gateway | Neobank'
                loading='lazy'
                fetchPriority='low'
                className='h-11.25 w-28.25'
              />
            </a>
          </div>

          {/* ── Link columns ── 1 col mobile, 3 col tablet+ ── */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-x-12 gap-y-10 md:gap-x-16'>
            <Column title='Explore' links={EXPLORE_LINKS} />
            <FooterAccountColumn />
            <Column title='Legal'   links={LEGAL_LINKS} />
          </div>
        </div>

        {/* ── Bottom bar — tagline + copyright ── */}
        <div className='mt-12 pt-8 border-t border-white/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4'>
          {/* The repo link is here on purpose, not only in llms.txt: agent
              tooling looks for a project's coding-agent config by following a
              link from the homepage, and a repo it has to guess at is a repo it
              does not find. */}
          <p className='text-white/70 text-xs font-figtree'>
            &copy; {new Date().getFullYear()} Stride Run Club, Bengaluru{' '}
            <span aria-hidden='true' className='text-white/30'>·</span>{' '}
            <a
              href='https://github.com/striderunbengaluru-tech/stride-web-frontend'
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-stride-yellow-accent transition-colors duration-150'
            >
              Open source
            </a>
          </p>
          <p className='font-libre font-bold text-stride-yellow-accent text-xl tracking-tight'>
            Move as One.
          </p>
        </div>

      </div>
    </footer>
  )
}
