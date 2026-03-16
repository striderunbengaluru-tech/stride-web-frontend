import type { Metadata } from 'next'
import { ArrowRight, Users, Calendar, Trophy, TrendingUp, Target, Zap, Heart, Radio } from 'lucide-react'
import { LogoMarquee } from '@/components/partnerships/logo-marquee'
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
    'Get your brand in front of 2,000+ active, health-conscious runners in Bengaluru. Stride Run Club offers authentic brand partnerships across events, content, and community.',
}

const STAT_ICONS = [Users, Calendar, Trophy, TrendingUp]
const WHY_ICONS = [Target, Zap, Heart, Radio]

function WhatsAppIcon() {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
      <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
    </svg>
  )
}

export default function PartnershipsPage() {
  return (
    <main className='min-h-screen bg-stride-purple-primary pt-24 pb-24 overflow-x-hidden'>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className='max-w-5xl mx-auto px-6 pt-16 pb-20 text-center'>
        <h1 className='text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6'>
          Brands that run<br />
          <span className='text-stride-yellow-accent'>with us, win.</span>
        </h1>

        <p className='text-white/60 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10'>
          Stride is Bengaluru&apos;s most engaged running community — 2,000+ health-conscious,
          high-intent members who show up every week. Not followers. Runners.
        </p>

        <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
          <a
            href={WHATSAPP_LINK}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2.5 bg-stride-yellow-accent text-copy-black font-bold px-8 py-4 rounded-md hover:bg-stride-yellow-accent/90 transition-colors text-base min-h-12'
          >
            <WhatsAppIcon />
            Partner With Us
          </a>
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
          {STATS.map((stat, i) => {
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
          {/* Fade edges */}
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
          <h2 className='text-4xl sm:text-5xl font-bold text-white'>
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
                {/* Gradient top accent line */}
                <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stride-yellow-accent/50 to-transparent' />

                {/* Background number */}
                <span className='absolute top-5 right-6 text-6xl font-bold text-white/[0.04] font-libre leading-none select-none pointer-events-none'>
                  {String(index + 1).padStart(2, '0')}
                </span>

                {/* Icon */}
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

      {/* ── INDUSTRIES ───────────────────────────────────────── */}
      <section className='max-w-5xl mx-auto px-6 mb-24'>
        <div className='text-center mb-12'>
          <p className='text-stride-yellow-accent text-xs font-semibold uppercase tracking-widest mb-3'>
            Our Partners
          </p>
          <h2 className='text-4xl sm:text-5xl font-bold text-white'>
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
                    <p className='text-white/75 font-semibold text-xs leading-tight mb-1'>{partner.name}</p>
                    {partner.tagline && (
                      <p className='text-white/30 text-[10px]'>{partner.tagline}</p>
                    )}
                  </div>
                ))}

                {/* "Your brand here" slot */}
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
          <blockquote className='text-white text-xl sm:text-2xl font-medium leading-relaxed mb-6'>
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
          {/* Decorative circles */}
          <div className='pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-copy-black/5' />
          <div className='pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-copy-black/5' />

          <p className='text-copy-black/60 text-xs font-semibold uppercase tracking-widest mb-4 relative'>
            Let&apos;s build something together
          </p>
          <h2 className='text-copy-black text-4xl sm:text-5xl font-bold mb-4 relative'>
            Ready to run with us?
          </h2>
          <p className='text-copy-black/70 text-base mb-8 max-w-sm mx-auto relative'>
            Drop us a message on WhatsApp and we&apos;ll put together a custom
            partnership package for your brand.
          </p>
          <a
            href={WHATSAPP_LINK}
            target='_blank'
            rel='noopener noreferrer'
            className='relative inline-flex items-center gap-2.5 bg-copy-black text-white font-bold px-8 py-4 rounded-md hover:bg-copy-black/85 transition-colors text-base min-h-12'
          >
            <WhatsAppIcon />
            Chat on WhatsApp
          </a>
          <p className='text-copy-black/50 text-xs mt-4 relative'>
            +91 95606 02019 · Typically replies within the hour
          </p>
        </div>
      </section>

    </main>
  )
}
