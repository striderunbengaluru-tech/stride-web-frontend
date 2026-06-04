'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

const STRAVA_ICON = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/strava-icon.svg'
const PEAKST8_LOGO = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/peakst8-logo.svg'

const INSTAGRAM_URL = 'https://www.instagram.com/stride_runclub_bengaluru/'
const STRAVA_URL = 'https://strava.app.link/Xqy627oEd3b'

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden='true'>
      <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' />
    </svg>
  )
}

export default function SocialCtaSection() {
  return (
    <section className='px-4 md:px-6 pb-24'>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.55, ease: EASE }}
        className='mx-auto max-w-6xl'
      >
        {/* Card */}
        <div className='bg-white/5 border border-white/10 rounded-2xl overflow-hidden'>

          {/* Header */}
          <div className='px-8 md:px-12 pt-10 pb-8'>
            <p className='text-xs font-mono uppercase tracking-[0.25em] text-stride-yellow-accent mb-4'>
              Find us everywhere
            </p>
            <h2 className='font-libre text-3xl md:text-4xl font-bold text-white leading-snug mb-3'>
              The proof is<br />
              <span className='text-stride-yellow-accent'>in the miles.</span>
            </h2>
            <p className='text-white/55 text-sm max-w-lg font-figtree leading-relaxed'>
              Follow along on Instagram, track your runs with us on Strava, or see what the wider community has to say.
            </p>
          </div>

          {/* Divider */}
          <div className='border-t border-white/8' />

          {/* 3 CTA rows — stacked on mobile/tablet, split horizontally on lg+ */}
          <div className='grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/8'>

            {/* peakst8 */}
            <a
              href='https://www.instagram.com/p/DVgGlAWibqy/'
              target='_blank'
              rel='noopener noreferrer'
              className='group flex items-start gap-4 px-8 lg:px-10 py-7 hover:bg-white/4 transition-colors duration-200'
            >
              <Image
                src={PEAKST8_LOGO}
                alt='peakst8'
                width={80}
                height={24}
                className='h-5 w-auto mt-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity duration-200'
              />
              <div className='flex-1 min-w-0'>
                <p className='text-white/70 text-sm font-medium group-hover:text-white transition-colors duration-200'>
                  The Fittest Club in India
                </p>
                <p className='text-white/50 text-xs mt-0.5 font-figtree'>See what peakst8 has to say</p>
              </div>
              <ArrowUpRight
                size={18}
                className='text-stride-yellow-accent mt-0.5 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200'
              />
            </a>

            {/* Instagram */}
            <a
              href={INSTAGRAM_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='group flex items-start gap-4 px-8 lg:px-10 py-7 hover:bg-pink-500/5 transition-colors duration-200'
            >
              <InstagramIcon className='w-5 h-5 text-pink-400 mt-0.5 shrink-0' />
              <div className='flex-1 min-w-0'>
                <p className='text-white/70 text-sm font-medium group-hover:text-white transition-colors duration-200'>
                  Instagram
                </p>
                <p className='text-white/50 text-xs mt-0.5 font-figtree'>@stride_runclub_bengaluru</p>
              </div>
              <ArrowUpRight
                size={18}
                className='text-pink-400/50 mt-0.5 shrink-0 group-hover:text-pink-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200'
              />
            </a>

            {/* Strava */}
            <a
              href={STRAVA_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='group flex items-start gap-4 px-8 lg:px-10 py-7 hover:bg-orange-500/5 transition-colors duration-200'
            >
              <Image
                src={STRAVA_ICON}
                alt='Strava'
                width={20}
                height={20}
                className='w-5 h-5 mt-0.5 shrink-0 group-hover:scale-110 transition-transform duration-200'
              />
              <div className='flex-1 min-w-0'>
                <p className='text-white/70 text-sm font-medium group-hover:text-white transition-colors duration-200'>
                  Strava Club
                </p>
                <p className='text-white/50 text-xs mt-0.5 font-figtree'>Join and log your runs with us</p>
              </div>
              <ArrowUpRight
                size={18}
                className='text-orange-400/50 mt-0.5 shrink-0 group-hover:text-orange-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200'
              />
            </a>

          </div>
        </div>
      </motion.div>
    </section>
  )
}
