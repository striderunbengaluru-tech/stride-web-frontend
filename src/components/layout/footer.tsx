import Link from 'next/link';
import Image from 'next/image';
import { Instagram, MessageCircle, Youtube } from 'lucide-react';

const NAV_LINKS = [
  { title: 'Events', href: '/events' },
  { title: 'Shop', href: '/shop' },
  { title: 'Leaderboard', href: '/leaderboard' },
  { title: 'Team', href: '/team' },
];

const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/stride_runclub_bengaluru/',
    icon: Instagram,
  },
  {
    label: 'Community',
    href: '#',
    icon: MessageCircle,
  },
  {
    label: 'YouTube',
    href: '#',
    icon: Youtube,
  },
];

export default function Footer() {
  return (
    <footer className='border-t border-copy-white/10 py-12 md:py-16'>
      <div className='mx-auto max-w-5xl px-6'>

        {/* Logo */}
        <Link href='/' aria-label='Stride Run Club home' className='mx-auto mb-6 block w-fit'>
          <Image
            src='/assets/images/stride-logo-full.webp'
            alt='Stride Run Club'
            width={160}
            height={50}
            className='object-contain'
          />
        </Link>

        {/* Tagline */}
        <p className='text-center text-copy-white/50 text-sm mb-8'>
          Bengaluru&apos;s community for runners of all paces. Move as One.
        </p>

        {/* Nav links */}
        <nav className='mb-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm' aria-label='Footer navigation'>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className='text-copy-white/60 hover:text-stride-yellow-accent transition-colors duration-150'
            >
              {link.title}
            </Link>
          ))}
        </nav>

        {/* Social icons */}
        <div className='mb-8 flex justify-center gap-6'>
          {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              aria-label={label}
              className='text-copy-white/50 hover:text-stride-yellow-accent transition-colors duration-150'
            >
              <Icon className='size-5' />
            </Link>
          ))}
        </div>

        {/* Copyright */}
        <p className='text-center text-copy-white/30 text-xs'>
          &copy; {new Date().getFullYear()} Stride Run Club, Bengaluru. All rights reserved.
        </p>

      </div>
    </footer>
  );
}
