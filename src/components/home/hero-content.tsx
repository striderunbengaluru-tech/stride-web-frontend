'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Share2, MessageCircle, Users, Calendar, Building2, ArrowUpRight } from 'lucide-react'
import { HighlightedText } from '@/components/ui/highlighted-text'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { MagneticButton } from '@/components/ui/magnetic-button'
import heroData from '@/content/hero.json'

const STRAVA_ICON = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/strava-icon.svg'
const PEAKST8_LOGO = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/peakst8-logo.svg'

const INSTAGRAM_URL = 'https://www.instagram.com/stride_runclub_bengaluru/'
const STRAVA_URL = 'https://strava.app.link/Xqy627oEd3b'

const STATS = [
  { Icon: Share2,        to: 52,   suffix: 'K+', formatLocale: false, label: 'Instagram Followers' },
  { Icon: MessageCircle, to: 6,    suffix: 'K+', formatLocale: false, label: 'WhatsApp Community'  },
  { Icon: Users,         to: 6894, suffix: '',   formatLocale: true,  label: 'Runners Impacted'    },
  { Icon: Calendar,      to: 97,   suffix: '+',  formatLocale: false, label: 'Events per Year'     },
  { Icon: Building2,     to: 55,   suffix: '+',  formatLocale: false, label: 'Brand Partners'      },
]

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden='true'>
      <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' />
    </svg>
  )
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]

const fade = (delay = 0) => ({
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay },
  },
})

export default function HeroContent() {
  const { heading, subheading } = heroData.content

  return (
    <div className='max-w-6xl mx-auto text-center'>

      {/* Heading */}
      <motion.h2
        variants={fade(0)}
        initial='hidden'
        whileInView='show'
        viewport={{ once: true, margin: '-60px' }}
        className='text-4xl lg:text-5xl font-bold text-white mb-4'
      >
        <HighlightedText text={heading} />
      </motion.h2>

      {/* Subheading */}
      <motion.p
        variants={fade(0.08)}
        initial='hidden'
        whileInView='show'
        viewport={{ once: true, margin: '-60px' }}
        className='text-base md:text-lg text-copy-white/75 mb-6 max-w-2xl mx-auto leading-relaxed'
      >
        {subheading}
      </motion.p>

      {/* Social proof pill */}
      <motion.div
        variants={fade(0.16)}
        initial='hidden'
        whileInView='show'
        viewport={{ once: true, margin: '-60px' }}
        className='mb-10'
      >
        <a
          href='https://www.instagram.com/p/DVgGlAWibqy/'
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-4 py-2 text-xs text-white/55 hover:text-white/85 hover:border-white/25 transition-all duration-150 group'
        >
          Don&apos;t listen to us — see what
          <Image src={PEAKST8_LOGO} alt='peakst8' width={64} height={20} className='h-4 w-auto inline-block' />
          has to say
          <ArrowUpRight size={12} className='text-stride-yellow-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150' />
        </a>
      </motion.div>

      {/* CTAs */}
      <motion.div
        variants={fade(0.24)}
        initial='hidden'
        whileInView='show'
        viewport={{ once: true, margin: '-60px' }}
        className='flex flex-col sm:flex-row items-center justify-center gap-4 mb-16'
      >
        {/* Instagram */}
        <MagneticButton
          as='a'
          href={INSTAGRAM_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='group relative inline-flex items-center gap-3 overflow-hidden bg-white/6 border border-white/12 rounded-xl px-7 py-3.5 text-sm font-semibold text-white/80 transition-all duration-300 hover:text-white hover:border-pink-400/50 hover:shadow-lg hover:shadow-pink-500/15'
        >
          {/* Hover gradient fill */}
          <span className='absolute inset-0 bg-linear-to-r from-purple-600/20 via-pink-500/20 to-orange-400/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
          <InstagramIcon className='relative z-10 w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform duration-200' />
          <span className='relative z-10'>Catch our latest updates on Insta</span>
          <ArrowUpRight size={14} className='relative z-10 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150' />
        </MagneticButton>

        {/* Strava */}
        <MagneticButton
          as='a'
          href={STRAVA_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='group relative inline-flex items-center gap-3 overflow-hidden bg-white/6 border border-white/12 rounded-xl px-7 py-3.5 text-sm font-semibold text-white/80 transition-all duration-300 hover:text-white hover:border-orange-400/50 hover:shadow-lg hover:shadow-orange-500/15'
        >
          <span className='absolute inset-0 bg-orange-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
          <Image
            src={STRAVA_ICON}
            alt='Strava'
            width={20}
            height={20}
            className='relative z-10 w-5 h-5 group-hover:scale-110 transition-transform duration-200'
          />
          <span className='relative z-10'>Find us on Strava</span>
          <ArrowUpRight size={14} className='relative z-10 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150' />
        </MagneticButton>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={fade(0.32)}
        initial='hidden'
        whileInView='show'
        viewport={{ once: true, margin: '-60px' }}
        className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 border-t border-copy-white/15 pt-12'
      >
        {STATS.map(({ Icon, to, suffix, formatLocale, label }, i) => (
          <motion.div
            key={label}
            variants={fade(0.32 + i * 0.07)}
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-60px' }}
            className='flex flex-col items-center gap-1.5 py-4'
          >
            <Icon size={18} className='text-stride-yellow-accent mb-1' />
            <AnimatedCounter to={to} suffix={suffix} formatLocale={formatLocale} className='text-3xl lg:text-4xl font-bold text-white tabular-nums font-libre' />
            <p className='text-copy-white/45 text-xs uppercase tracking-wide'>{label}</p>
          </motion.div>
        ))}
      </motion.div>

    </div>
  )
}
