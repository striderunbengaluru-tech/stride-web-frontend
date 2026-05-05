import type { Metadata } from 'next'
import { ArrowRight, Share2, MessageCircle, Users, Calendar, Building2, Target, Video, Zap, Heart } from 'lucide-react'
import { LogoMarquee } from '@/components/partnerships/logo-marquee'
import ReelsCarousel from '@/components/partnerships/reels-carousel'
import PartnerWithUsButton from '@/components/partnerships/partner-with-us-button'
import PartnerGrid from '@/components/partnerships/partner-grid'
import SmoothScrollLink from '@/components/ui/smooth-scroll-link'
import {
  PARTNER_CATEGORIES,
  ALL_PARTNERS,
  WHY_US,
} from './partners-data'

const OG_IMAGE = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/partnerships-og.png'
const SITE_ORIGIN = 'https://strideclub.in'
const CANONICAL_URL = 'https://strideclub.in/partnerships/'

export const metadata: Metadata = {
  title: "Partner With India's Fittest Running Community | Stride Run Club",
  description:
    "52,000+ Instagram followers. 6,894 weekly runners. 55+ brand partners. Put your brand at every finish line in Bengaluru. Stride Run Club delivers authentic, high-ROI partnerships with India's most engaged fitness community.",
  openGraph: {
    title: "Partner With India's Fittest Running Community | Stride Run Club",
    description:
      "52,000+ followers. 6,894 runners. 55+ brand partners. Authentic partnerships with Bengaluru's most engaged fitness community.",
    url: CANONICAL_URL,
    siteName: 'Stride Run Club',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Partner With Stride Run Club — India's Fittest Running Community",
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Partner With India's Fittest Running Community",
    description:
      "52,000+ followers. 6,894 runners. 55+ brands. Authentic partnerships with Bengaluru's most engaged fitness community.",
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: CANONICAL_URL,
  },
  other: {
    'og:logo': 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.svg',
  },
}

const schemaOrg = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${CANONICAL_URL}#webpage`,
      url: CANONICAL_URL,
      name: "Partner With India's Fittest Running Community | Stride Run Club",
      description:
        "52,000+ Instagram followers. 6,894 weekly runners. 55+ brand partners. Authentic, high-ROI brand partnerships with Bengaluru's most engaged fitness community.",
      image: OG_IMAGE,
      inLanguage: 'en-IN',
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      about: { '@id': `${SITE_ORIGIN}/#organization` },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
      url: SITE_ORIGIN,
      name: 'Stride Run Club',
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    },
    {
      '@type': 'SportsOrganization',
      '@id': `${SITE_ORIGIN}/#organization`,
      name: 'Stride Run Club Bengaluru',
      alternateName: 'Stride Run Club',
      url: SITE_ORIGIN,
      logo: 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.svg',
      description:
        "India's most engaged running community — 6,894 runners, 52,000+ Instagram followers, and 97+ events per year across Bengaluru.",
      location: {
        '@type': 'Place',
        name: 'Bengaluru, Karnataka, India',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Bengaluru',
          addressRegion: 'Karnataka',
          addressCountry: 'IN',
        },
      },
      sameAs: ['https://www.instagram.com/stride_runclub_bengaluru/'],
      numberOfEmployees: {
        '@type': 'QuantitativeValue',
        value: 6894,
        unitText: 'community members',
      },
      offers: {
        '@type': 'Service',
        name: 'Brand Partnership Program',
        description:
          "Authentic brand partnerships with Bengaluru's most engaged running community. Offerings include event title sponsorships, UGC content collaborations, product sampling, WhatsApp community activations, and co-branded race kits.",
        provider: { '@id': `${SITE_ORIGIN}/#organization` },
        areaServed: {
          '@type': 'City',
          name: 'Bengaluru',
        },
        audience: {
          '@type': 'Audience',
          audienceType: 'Urban fitness enthusiasts, aged 22–35, equal gender ratio',
        },
      },
    },
  ],
}

const UPDATED_STATS = [
  { Icon: Share2,         value: '52K+',  label: 'Instagram Followers' },
  { Icon: MessageCircle,  value: '6K+',   label: 'WhatsApp Community' },
  { Icon: Users,          value: '6,894', label: 'Runners Impacted' },
  { Icon: Calendar,       value: '97+',   label: 'Events per Year' },
  { Icon: Building2,      value: '55+',   label: 'Brand Partners' },
]

const SUPABASE_LOGOS = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos'

const WHY_ICONS = [Target, Video, Zap, Heart]

const SUPABASE_WEB_ASSETS = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets'

const PARTNERSHIP_REELS = [
  { url: 'https://www.instagram.com/p/DW29ahUkeP9/',  title: 'A stellar partnership with Fuaark',        logoUrl: `${SUPABASE_LOGOS}/fuaark-logo.svg`,     partnerHandle: '@fuaark_official',  thumbnailUrl: `${SUPABASE_WEB_ASSETS}/fuaark-insta-thumb.jpg` },
  { url: 'https://www.instagram.com/p/DWmkXvok3p9/', title: "Declared India's fittest club by peakst8", logoUrl: `${SUPABASE_LOGOS}/peakst8-logo.svg`,     partnerHandle: '@peakst8',          thumbnailUrl: `${SUPABASE_WEB_ASSETS}/peakst8-insta-thumb.jpg`,   darkChip: true },
  { url: 'https://www.instagram.com/p/DU2q0Iyj3rn/', title: 'Fittest collaboration with Puma & HYROX',  logoUrl: `${SUPABASE_LOGOS}/puma-hyrox-logo.svg`,  partnerHandle: '@pumaindia',        thumbnailUrl: `${SUPABASE_WEB_ASSETS}/puma-hyrox-insta-thumb.jpg` },
  { url: 'https://www.instagram.com/p/DMu5SCTPXzG/', title: 'Ran hard, raved harder with Zepto',        logoUrl: `${SUPABASE_LOGOS}/zepto-logo.svg`,       partnerHandle: '@zeptoapp',         thumbnailUrl: `${SUPABASE_WEB_ASSETS}/zepto-insta-thumb.jpg` },
  { url: 'https://www.instagram.com/p/DLo1vcfua88/', title: 'With Olympian Neeraj Chopra',              emoji: '🥇',                                        partnerHandle: '@neeraj____chopra', thumbnailUrl: `${SUPABASE_WEB_ASSETS}/neeraj-insta-thumb.jpg` },
]

export default function PartnershipsPage() {
  return (
    <main className='min-h-screen bg-stride-purple-primary pt-24 pb-24 overflow-x-hidden'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />

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
          52,000+ followers. 6,894 runners. A city moving as one. Stride is Bengaluru&apos;s most engaged running
          community — high-intent, health-conscious members who show up every single week.
        </p>

        <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
          <PartnerWithUsButton />
          <SmoothScrollLink
            targetId='why-stride'
            className='inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm'
          >
            See why brands choose Stride
            <ArrowRight size={14} />
          </SmoothScrollLink>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────── */}
      <section className='max-w-5xl mx-auto px-6 mb-20'>
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4'>
          {UPDATED_STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5 text-center${i === 4 ? ' col-span-2 sm:col-span-1' : ''}`}
            >
              <stat.Icon size={18} className='text-stride-yellow-accent mx-auto mb-2' />
              <p className='text-3xl font-bold text-white tabular-nums'>{stat.value}</p>
              <p className='text-white/45 text-xs mt-1'>{stat.label}</p>
            </div>
          ))}
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
      <section id='why-stride' className='max-w-5xl mx-auto px-6 mb-16'>
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
                className='relative bg-white/5 border border-white/10 rounded-xl p-7 hover:border-stride-yellow-accent/25 hover:bg-white/10 transition-all group overflow-hidden flex flex-col'
              >
                <div className='absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-stride-yellow-accent/50 to-transparent' />
                <span className='absolute top-5 right-6 text-6xl font-bold text-white/4 font-libre leading-none select-none pointer-events-none'>
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className='w-11 h-11 rounded-lg bg-stride-yellow-accent/10 border border-stride-yellow-accent/20 flex items-center justify-center mb-5 group-hover:bg-stride-yellow-accent/15 group-hover:border-stride-yellow-accent/40 transition-colors'>
                  <Icon size={20} className='text-stride-yellow-accent' />
                </div>

                <h3 className='font-libre text-white font-bold text-xl mb-3'>{item.title}</h3>
                <p className='text-white/55 text-sm leading-relaxed'>{item.body}</p>

                {/* Badges */}
                {item.badges && (
                  <div className='flex flex-wrap gap-2 mt-4'>
                    {item.badges.map((badge) => (
                      <span
                        key={badge}
                        className='text-[11px] px-3 py-1 rounded-full bg-stride-yellow-accent/10 border border-stride-yellow-accent/20 text-stride-yellow-accent/80 font-medium'
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                {/* Brand label */}
                {item.brandLabel && (
                  <div className='mt-4'>
                    <span className='inline-block text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/70 font-semibold tracking-wide'>
                      {item.brandLabel}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── MID-PAGE CTA ─────────────────────────────────────── */}
      <section className='max-w-3xl mx-auto px-6 mb-24'>
        <div className='relative overflow-hidden rounded-2xl bg-stride-yellow-accent p-8 sm:p-12 text-center'>
          <div className='pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-copy-black/5' />
          <div className='pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-copy-black/5' />

          <p className='text-copy-black/60 text-xs font-semibold uppercase tracking-widest mb-4 relative'>
            Let&apos;s build something together
          </p>
          <h2 className='text-copy-black text-3xl sm:text-4xl font-bold mb-4 relative font-libre leading-tight'>
            Don&apos;t advertise to runners.<br />Run with them.
          </h2>
          <p className='text-copy-black/70 text-sm sm:text-base mb-8 max-w-sm mx-auto relative leading-relaxed'>
            One partnership with Stride puts your brand at every finish line, in every post-run photo,
            and across every WhatsApp group in Bengaluru&apos;s most active running community.
          </p>
          <PartnerWithUsButton
            label='Partner With Us'
            className='relative inline-flex items-center gap-2.5 bg-copy-black text-white font-bold px-8 py-4 rounded-md hover:bg-copy-black/85 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150 text-base min-h-12'
          />
        </div>
      </section>

      {/* ── SEE IT FOR YOURSELF ──────────────────────────────── */}
      <section className='max-w-5xl mx-auto px-6 mb-24'>
        <div className='text-center mb-10'>
          <p className='text-stride-yellow-accent text-xs font-semibold uppercase tracking-widest mb-3'>
            Real Partnerships. Real Impact.
          </p>
          <h2 className='text-4xl sm:text-5xl font-bold text-white font-libre'>
            See it for yourself.
          </h2>
          <p className='text-white/50 mt-3 max-w-lg mx-auto'>
            Five partnerships. Real runs. Proof in every frame.
          </p>
        </div>

        <div className='-mx-6'>
          <ReelsCarousel reels={PARTNERSHIP_REELS} />
        </div>
      </section>

      {/* ── OUR PARTNERS ─────────────────────────────────────── */}
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

        <PartnerGrid categories={PARTNER_CATEGORIES} />
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
            className='relative inline-flex items-center gap-2.5 bg-copy-black text-white font-bold px-8 py-4 rounded-md hover:bg-copy-black/85 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150 text-base min-h-12'
          />
          <p className='text-copy-black/50 text-xs mt-4 relative'>
            +91 95606 02019 · Typically replies within the hour
          </p>
        </div>
      </section>

    </main>
  )
}
