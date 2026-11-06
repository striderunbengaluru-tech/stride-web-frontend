import Image from 'next/image'
import Link from 'next/link'
import { SLAY_TAGLINE, SLAY_UMBRELLA_LINE } from '@/content/slay'
import { SLAY_LOGOS } from '@/content/slay-photos'

const STRIDE_LOGO = { src: '/assets/images/stride-logo-color-transparent.webp', width: 339, height: 128 }

const LINKS = [
  { label: 'Stride Run Club', href: '/' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-service' },
] as const

export function SlayFooter() {
  return (
    <footer className='bg-slay-ink px-4 pb-10 pt-20 sm:px-8'>
      <div className='mx-auto max-w-6xl'>
        <div className='flex flex-col items-center gap-8 text-center'>
          <div className='flex items-center gap-6 sm:gap-10'>
            <Image src={SLAY_LOGOS.wordmarkLime.src} width={SLAY_LOGOS.wordmarkLime.width} height={SLAY_LOGOS.wordmarkLime.height} alt='Slay Run Club' className='h-16 w-auto sm:h-24' />
            <span aria-hidden className='font-slay text-4xl text-copy-white/40'>×</span>
            <Image src={STRIDE_LOGO.src} width={STRIDE_LOGO.width} height={STRIDE_LOGO.height} alt='Stride Run Club' className='h-12 w-auto sm:h-16' />
          </div>
          <p className='max-w-xl text-lg leading-relaxed text-copy-white/85'>{SLAY_UMBRELLA_LINE}</p>
          <p className='font-slay text-[clamp(3rem,14vw,9rem)] uppercase leading-none text-slay-pink'>{SLAY_TAGLINE}</p>
        </div>
        <div className='mt-14 flex flex-col items-center justify-between gap-4 border-t border-copy-white/15 pt-6 text-sm text-copy-white/60 sm:flex-row'>
          <p>© {new Date().getFullYear()} Slay Run Club · Bengaluru</p>
          <ul className='flex flex-wrap justify-center gap-x-6 gap-y-2'>
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className='inline-flex min-h-11 items-center hover:text-slay-lime'>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
