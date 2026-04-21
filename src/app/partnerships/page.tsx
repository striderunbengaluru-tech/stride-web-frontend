import type { Metadata } from 'next'
import { ArrowRight, Users, Calendar, Trophy, TrendingUp, Target, Zap, Heart, Radio, Sparkles } from 'lucide-react'
import { LogoMarquee } from '@/components/partnerships/logo-marquee'
import ReelsCarousel from '@/components/partnerships/reels-carousel'
import PartnerWithUsButton from '@/components/partnerships/partner-with-us-button'
import {
  PARTNER_CATEGORIES,
  ALL_PARTNERS,
  STATS,
  WHY_US,
  WHATSAPP_LINK,
} from './partners-data'

export const metadata: Metadata = {
  title: 'Partner With Us — Stride Run Club',
  description:
    'Get your brand in front of 51,000+ followers and 5,754 active runners in Bengaluru. Stride Run Club offers authentic brand partnerships across events, content, and community.',
}

const UPDATED_STATS = [
  { value: '51K+', label: 'Instagram Followers' },
  { value: '5,754', label: 'Unique Runners in 2025' },
  { value: '97+', label: 'Events per Year' },
  { value: '15+', label: 'Brand Partners' },
]

const STAT_ICONS = [Users, Calendar, Trophy, TrendingUp]
const WHY_ICONS = [Target, Zap, Heart, Radio]

const CREATOR_REELS = [
  'https://www.instagram.com/p/DVEAnORkgge/',
  'https://www.instagram.com/p/DU4_xTLkdKH/',
  'https://www.instagram.com/p/DW29ahUkeP9/',
  'https://www.instagram.com/p/DWW4GUOgeZL/',
  'https://www.instagram.com/p/DXFRfBJgdCh/',
]

export default function PartnershipsPage() {
  return (
    <main className='min-h-screen bg-stride-purple-primary pt-24 pb-24 overflow-x-hidden'>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className='max-w-5xl mx-auto px-6 pt-16 pb-20 text-center'>
        <span className='inline-block text-xs uppercase tracking-widest text-stride-yellow-accent font-medium mb-6 px-3 py-1 rounded-full border border-stride-yellow-accent/30 bg-stride-yellow-accent/10'>
          Brand Partnerships
        </span>
        <h1 className='text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6 font-libre'>
          Partner with India&apos;s<br />
          <span className='text-stride-yellow-accent'>fittest community.</span>
        </h1>

        <p className='text-white/60 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10'>
          51,200+ followers. 5,754 runners. A city moving as one. Stride is Bengaluru&apos;s most engaged running
          community — high-intent, health-conscious members who show up every single week.
        </p>

        <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
          <PartnerWithUsButton />
          <a
            href='#why-stride'
            className='inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm'
          >
            See why brands choose Stride
            <ArrowRight size={14} />
          </a>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────── */}
      <section className='max-w-4xl mx-auto px-6 mb-20'>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
          {UPDATED_STATS.map((stat, i) => {
            const Icon = STAT_ICONS[i]
            return (
              <div
                key={stat.label}
                className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5 text-center'
              >
                <Icon size={18} className='text-stride-yellow-accent mx-auto mb-2' />
                <p className='text-3xl font-bold text-white tabular-nums'>{stat.value}</p>
                <p className='text-white/45 text-xs mt-1'>{stat.label}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── LOGO MARQUEE ─────────────────────────────────────── */}
      <section className='mb-20'>
        <p className='text-center text-white/30 text-xs uppercase tracking-widest mb-8'>
          Brands that have partnered with Stride
        </p>
        <div className='relative'>
          <div className='pointer-events-none absolute inset-y-0 left-0 w-24 bg-linear-to-r from-stride-purple-primary to-transparent z-10' />
          <div className='pointer-events-none absolute inset-y-0 right-0 w-24 bg-linear-to-l from-stride-purple-primary to-transparent z-10' />
          <LogoMarquee partners={ALL_PARTNERS} />
        </div>
      </section>

      {/* ── WHY STRIDE ───────────────────────────────────────── */}
      <section id='why-stride' className='max-w-5xl mx-auto px-6 mb-24'>
        <div className='text-center mb-12'>
          <p className='text-stride-yellow-accent text-xs font-semibold uppercase tracking-widest mb-3'>
            Why Stride
          </p>
          <h2 className='text-4xl sm:text-5xl font-bold text-white font-libre'>
            A community that converts.
          </h2>
          <p className='text-white/50 mt-4 max-w-xl mx-auto'>
            Running clubs aren&apos;t just exercise groups. They&apos;re tight-knit tribes with shared values,
            shared goals, and — critically — shared spending habits.
          </p>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
          {WHY_US.map((item, index) => {
            const Icon = WHY_ICONS[index]
            return (
              <div
                key={item.id}
                className='relative bg-white/5 border border-white/10 rounded-xl p-7 hover:border-stride-yellow-accent/25 hover:bg-white/10 transition-all group overflow-hidden'
              >
                <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stride-yellow-accent/50 to-transparent' />
                <span className='absolute top-5 right-6 text-6xl font-bold text-white/[0.04] font-libre leading-none select-none pointer-events-none'>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className='w-11 h-11 rounded-lg bg-stride-yellow-accent/10 border border-stride-yellow-accent/20 flex items-center justify-center mb-5 group-hover:bg-stride-yellow-accent/15 group-hover:border-stride-yellow-accent/40 transition-colors'>
                  <Icon size={20} className='text-stride-yellow-accent' />
                </div>
                <h3 className='font-libre text-white font-bold text-xl mb-3'>{item.title}</h3>
                <p className='text-white/55 text-sm leading-relaxed'>{item.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── STRIDE CREATOR PROGRAM ───────────────────────────── */}
      <section className='max-w-5xl mx-auto px-6 mb-24'>
        <div className='text-center mb-12'>
          <div className='inline-flex items-center gap-2 text-stride-yellow-accent text-xs font-semibold uppercase tracking-widest mb-3'>
            <Sparkles size={14} />
            Stride Originals
          </div>
          <h2 className='text-4xl sm:text-5xl font-bold text-white font-libre mb-4'>
            Tap into a network of{' '}
            <span className='text-stride-yellow-accent'>fitness creators.</span>
          </h2>
          <p className='text-white/55 mt-2 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed'>
            The Stride Creator Program is a 4-week bootcamp that turns passionate runners into
            content creators. Your brand gets featured authentically — woven into their journey,
            not slapped on as an ad. Real people. Real runs. Real reach.
          </p>
        </div>

        {/* Creator program benefits */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12'>
          {[
            { value: '51K+', label: 'Platform followers', sub: '@stride_runclub_bengaluru' },
            { value: '4 weeks', label: 'Program duration', sub: 'Intensive bootcamp format' },
            { value: 'Invite-only', label: 'Creator selection', sub: 'Curated, quality-first' },
          ].map(({ value, label, sub }) => (
            <div
              key={label}
              className='bg-white/5 border border-white/10 rounded-xl px-6 py-6 text-center'
            >
              <p className='text-2xl font-bold text-stride-yellow-accent font-libre mb-1'>{value}</p>
              <p className='text-white font-semibold text-sm mb-1'>{label}</p>
              <p className='text-white/40 text-xs'>{sub}</p>
            </div>
          ))}
        </div>

        {/* Negative margin breaks out of section px-6, giving the reels full width */}
        <div className='-mx-6'>
          <ReelsCarousel urls={CREATOR_REELS} />
        </div>

        <div className='text-center mt-10'>
          <PartnerWithUsButton
            label='Partner with Stride Creators'
            showIcon={false}
            className='inline-flex items-center gap-2 border border-stride-yellow-accent text-stride-yellow-accent font-bold px-8 py-3.5 rounded-md hover:bg-stride-yellow-accent hover:text-copy-black transition-all duration-200 text-sm'
          />
        </div>
      </section>

      {/* ── SEE IT FOR YOURSELF ──────────────────────────────── */}
      <section className='max-w-5xl mx-auto px-6 mb-24'>
        <div className='text-center mb-10'>
          <p className='text-stride-yellow-accent text-xs font-semibold uppercase tracking-widest mb-3'>
            @stride_runclub_bengaluru
          </p>
          <h2 className='text-4xl sm:text-5xl font-bold text-white font-libre'>
            See it for yourself.
          </h2>
          <p className='text-white/50 mt-3 max-w-lg mx-auto'>
            51,200 followers. A community that actually shows up. Scroll through and feel the energy.
          </p>
        </div>

        <div className='flex justify-center'>
          <div className='w-full max-w-2xl rounded-2xl overflow-hidden border border-white/10'>
            <iframe
              src='https://www.instagram.com/stride_runclub_bengaluru/embed/'
              width='100%'
              height='600'
              frameBorder='0'
              scrolling='no'
              allowTransparency={true}
              title='Stride Run Club Instagram'
              className='block'
            />
          </div>
        </div>

        <div className='text-center mt-8'>
          <a
            href='https://www.instagram.com/stride_runclub_bengaluru/'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 text-white/60 hover:text-stride-yellow-accent transition-colors text-sm'
          >
            Follow @stride_runclub_bengaluru
            <ArrowRight size={14} />
          </a>
        </div>
      </section>

      {/* ── INDUSTRIES ───────────────────────────────────────── */}
      <section className='max-w-5xl mx-auto px-6 mb-24'>
        <div className='text-center mb-12'>
          <p className='text-stride-yellow-accent text-xs font-semibold uppercase tracking-widest mb-3'>
            Our Partners
          </p>
          <h2 className='text-4xl sm:text-5xl font-bold text-white font-libre'>
            Every industry. One community.
          </h2>
          <p className='text-white/50 mt-4 max-w-lg mx-auto'>
            From running shoes to post-run coffee — Stride connects brands across
            the full spectrum of an active lifestyle.
          </p>
        </div>

        <div className='space-y-14'>
          {PARTNER_CATEGORIES.map((category) => (
            <div key={category.id}>
              <div className='mb-6'>
                <div className='flex items-center gap-3 mb-2'>
                  <span className='inline-block w-0.5 h-7 bg-stride-yellow-accent rounded-full shrink-0' />
                  <h3 className='font-libre text-2xl sm:text-3xl font-bold text-white'>{category.label}</h3>
                </div>
                <p className='text-white/40 text-sm pl-4'>{category.description}</p>
              </div>

              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3'>
                {category.partners.map((partner) => (
                  <div
                    key={partner.id}
                    className='bg-white/5 border border-white/10 rounded-xl px-4 py-5 flex flex-col items-center text-center hover:bg-white/10 hover:border-white/20 transition-colors group'
                  >
                    <div className='w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover:border-stride-yellow-accent/30 transition-colors'>
                      {partner.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={partner.logoUrl}
                          alt={partner.name}
                          className='w-6 h-6 object-contain'
                          loading='lazy'
                        />
                      ) : (
                        <span className='text-stride-yellow-accent font-bold text-sm'>
                          {partner.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <p className='text-white/75 font-semibold text-xs leading-tight mb-1 line-clamp-2'>{partner.name}</p>
                    {partner.tagline && (
                      <p className='text-white/30 text-[10px]'>{partner.tagline}</p>
                    )}
                  </div>
                ))}

                <a
                  href={WHATSAPP_LINK}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='border border-dashed border-stride-yellow-accent/30 rounded-xl px-4 py-5 flex flex-col items-center text-center hover:border-stride-yellow-accent/70 hover:bg-stride-yellow-accent/5 transition-colors group'
                >
                  <div className='w-10 h-10 rounded-full border border-dashed border-stride-yellow-accent/30 flex items-center justify-center mb-3 group-hover:border-stride-yellow-accent/60 transition-colors'>
                    <span className='text-stride-yellow-accent/50 text-lg group-hover:text-stride-yellow-accent transition-colors'>+</span>
                  </div>
                  <p className='text-stride-yellow-accent/50 font-semibold text-xs group-hover:text-stride-yellow-accent transition-colors'>Your Brand</p>
                  <p className='text-white/25 text-[10px] mt-1 group-hover:text-white/40 transition-colors'>Join us</p>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF QUOTE ───────────────────────────────── */}
      <section className='max-w-3xl mx-auto px-6 mb-24'>
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-8 sm:p-12 text-center'>
          <p className='text-stride-yellow-accent text-4xl mb-6 font-bold'>&ldquo;</p>
          <blockquote className='text-white text-xl sm:text-2xl font-medium leading-relaxed mb-6 font-libre italic'>
            The Stride community doesn&apos;t just wear our gear —
            they evangelize it. The ROI from one event beats
            three months of digital ads.
          </blockquote>
          <p className='text-white/40 text-sm'>— A Fitness Brand Partner, 2024</p>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className='max-w-3xl mx-auto px-6'>
        <div className='relative overflow-hidden rounded-2xl bg-stride-yellow-accent p-10 sm:p-14 text-center'>
          <div className='pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-copy-black/5' />
          <div className='pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-copy-black/5' />

          <p className='text-copy-black/60 text-xs font-semibold uppercase tracking-widest mb-4 relative'>
            Let&apos;s build something together
          </p>
          <h2 className='text-copy-black text-4xl sm:text-5xl font-bold mb-4 relative font-libre'>
            Ready to run with us?
          </h2>
          <p className='text-copy-black/70 text-base mb-8 max-w-sm mx-auto relative'>
            Fill in a quick form and we&apos;ll put together a custom
            partnership package for your brand.
          </p>
          <PartnerWithUsButton
            label='Partner With Us'
            className='relative inline-flex items-center gap-2.5 bg-copy-black text-white font-bold px-8 py-4 rounded-md hover:bg-copy-black/85 transition-colors text-base min-h-12'
          />
          <p className='text-copy-black/50 text-xs mt-4 relative'>
            +91 95606 02019 · Typically replies within the hour
          </p>
        </div>
      </section>

    </main>
  )
}
