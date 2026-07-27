import type { Metadata } from 'next'
import { LogoMarquee } from '@/components/partnerships/logo-marquee'
import ReelsCarousel from '@/components/partnerships/reels-carousel'
import PartnerGrid from '@/components/partnerships/partner-grid'
import PartnershipsHero from '@/components/partnerships/partnerships-hero'
import AnimatedStatsBar from '@/components/partnerships/animated-stats-bar'
import AnimatedWhyUs from '@/components/partnerships/animated-why-us'
import PartnerWithUsButton from '@/components/partnerships/partner-with-us-button'
import { Reveal } from '@/components/ui/reveal'
import {
  PARTNER_CATEGORIES,
  ALL_PARTNERS,
  WHY_US,
} from './partners-data'

const OG_IMAGE = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/partnerships-new-og.png'
const SITE_ORIGIN = 'https://www.strideclub.in'
const CANONICAL_URL = 'https://www.strideclub.in/partnerships/'

export const metadata: Metadata = {
  title: "Partner With India's Fittest Running Community | Stride Run Club",
  description:
    "52,000+ Instagram followers. 7,000+ weekly athletes. 55+ brand partners. Put your brand at every finish line in Bengaluru with India's most engaged running community.",
  openGraph: {
    title: "Partner With India's Fittest Running Community | Stride Run Club",
    description:
      "52,000+ followers. 7,000+ athletes. 55+ brand partners. Authentic partnerships with Bengaluru's most engaged fitness community.",
    url: CANONICAL_URL,
    siteName: 'Stride Run Club',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Partner With Stride Run Club, India's Fittest Running Community",
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Partner With India's Fittest Running Community",
    description:
      "52,000+ followers. 7,000+ athletes. 55+ brands. Authentic partnerships with Bengaluru's most engaged fitness community.",
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
        "52,000+ Instagram followers. 7,000+ weekly athletes. 55+ brand partners. Brand partnerships with Bengaluru's most engaged fitness community.",
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
        "India's most engaged running community: 7,000+ athletes, 52,000+ Instagram followers, and 97+ events per year across Bengaluru.",
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

const SUPABASE_LOGOS = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos'

const SUPABASE_WEB_ASSETS = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets'

const PARTNERSHIP_REELS = [
  { url: 'https://www.instagram.com/p/DW29ahUkeP9/',  title: 'A stellar partnership with Fuaark',        logoUrl: `${SUPABASE_LOGOS}/fuaark-logo.svg`,     partnerHandle: '@fuaark_official',  thumbnailUrl: `${SUPABASE_WEB_ASSETS}/fuaark-insta-thumb.webp` },
  { url: 'https://www.instagram.com/p/DWmkXvok3p9/', title: "Declared India's fittest club by peakst8", logoUrl: `${SUPABASE_LOGOS}/peakst8-logo.svg`,     partnerHandle: '@peakst8',          thumbnailUrl: `${SUPABASE_WEB_ASSETS}/peakst8-insta-thumb.webp`,   darkChip: true },
  { url: 'https://www.instagram.com/p/DU2q0Iyj3rn/', title: 'Valentines Day partnership with PUMA and HYROX',  logoUrl: `${SUPABASE_LOGOS}/puma-hyrox-logo.svg`,  partnerHandle: '@pumaindia',        thumbnailUrl: `${SUPABASE_WEB_ASSETS}/puma-hyrox-insta-thumb.webp` },
  { url: 'https://www.instagram.com/p/DMu5SCTPXzG/', title: 'Ran hard, raved harder with Zepto',        logoUrl: `${SUPABASE_LOGOS}/zepto-logo.svg`,       partnerHandle: '@zeptoapp',         thumbnailUrl: `${SUPABASE_WEB_ASSETS}/zepto-insta-thumb.webp` },
  { url: 'https://www.instagram.com/p/DLo1vcfua88/', title: 'With Olympian Neeraj Chopra',              logoUrl: `${SUPABASE_LOGOS}/under-armour-logo.svg`,  partnerHandle: '@underarmourind',   thumbnailUrl: `${SUPABASE_WEB_ASSETS}/neeraj-insta-thumb.webp` },
]

export default function PartnershipsPage() {
  // `overflow-x-clip`, NOT `overflow-x-hidden`: hidden on one axis forces the
  // other to `auto`, which quietly makes this a scroll container and kills the
  // view() timeline of every <Reveal> below — they still render (base style is
  // opacity:1) but stop animating. clip contains the marquee overflow without
  // that side effect. See globals.css.
  return (
    <main className='min-h-screen bg-stride-purple-primary pt-16 md:pt-24 pb-24 overflow-x-clip'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <PartnershipsHero />

      {/* ── STATS BAR ────────────────────────────────────────── */}
      <section className='max-w-5xl mx-auto px-6 mb-20'>
        <AnimatedStatsBar />
      </section>

      {/* ── LOGO MARQUEE ─────────────────────────────────────── */}
      <section className='mb-20'>
        <p className='text-center text-white/30 text-xs font-mono uppercase tracking-widest mb-8'>
          Brands that have partnered with Stride
        </p>
        <div className='relative'>
          <div className='pointer-events-none absolute inset-y-0 left-0 w-8 md:w-24 bg-linear-to-r from-stride-purple-primary to-transparent z-10' />
          <div className='pointer-events-none absolute inset-y-0 right-0 w-8 md:w-24 bg-linear-to-l from-stride-purple-primary to-transparent z-10' />
          <LogoMarquee partners={ALL_PARTNERS} />
        </div>
      </section>

      {/* ── WHY STRIDE ───────────────────────────────────────── */}
      <section id='why-stride' className='max-w-5xl mx-auto px-6 mb-16'>
        <Reveal className='text-center mb-12'>
          <p className='text-stride-yellow-accent text-xs font-semibold font-mono uppercase tracking-widest mb-3'>
            Why Stride
          </p>
          <h2 className='text-4xl sm:text-5xl font-bold text-white font-libre'>
            A community that converts.
          </h2>
          <p className='text-white/50 mt-4 max-w-xl mx-auto'>
            Running clubs aren&apos;t just exercise groups. They&apos;re tight-knit tribes with shared values,
            shared goals, and shared spending habits.
          </p>
        </Reveal>

        <AnimatedWhyUs items={WHY_US} />
      </section>

      {/* ── MID-PAGE CTA ─────────────────────────────────────── */}
      <Reveal className='max-w-3xl mx-auto px-6 mb-24'>
        <div className='relative overflow-hidden rounded-2xl bg-stride-yellow-accent p-8 sm:p-12 text-center'>
          <div className='pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-copy-black/5' />
          <div className='pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-copy-black/5' />

          <p className='text-copy-black/60 text-xs font-semibold font-mono uppercase tracking-widest mb-4 relative'>
            Let&apos;s build something together
          </p>
          <h2 className='text-copy-black text-3xl sm:text-4xl font-bold mb-4 relative font-libre leading-tight'>
            Don&apos;t advertise to athletes.<br />Run with them.
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
      </Reveal>

      {/* ── SEE IT FOR YOURSELF ──────────────────────────────── */}
      <section className='max-w-5xl mx-auto px-6 mb-24'>
        <Reveal className='text-center mb-10'>
          <p className='text-stride-yellow-accent text-xs font-semibold font-mono uppercase tracking-widest mb-3'>
            Recent partnerships
          </p>
          <h2 className='text-4xl sm:text-5xl font-bold text-white font-libre'>
            See it for yourself.
          </h2>
          <p className='text-white/50 mt-3 max-w-lg mx-auto'>
            Five recent partnerships, filmed at our own runs.
          </p>
        </Reveal>

        <div className='-mx-6'>
          <ReelsCarousel reels={PARTNERSHIP_REELS} />
        </div>
      </section>

      {/* ── OUR PARTNERS ─────────────────────────────────────── */}
      <section className='max-w-5xl mx-auto px-6 mb-24'>
        <Reveal className='text-center mb-12'>
          <p className='text-stride-yellow-accent text-xs font-semibold font-mono uppercase tracking-widest mb-3'>
            Our Partners
          </p>
          <h2 className='text-4xl sm:text-5xl font-bold text-white font-libre'>
            Every industry. One community.
          </h2>
          <p className='text-white/50 mt-4 max-w-lg mx-auto'>
            From running shoes to post-run coffee, Stride connects brands to
            every part of an active life.
          </p>
        </Reveal>

        <PartnerGrid categories={PARTNER_CATEGORIES} />
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <Reveal className='max-w-3xl mx-auto px-6'>
        <div className='relative overflow-hidden rounded-2xl bg-stride-yellow-accent p-10 sm:p-14 text-center'>
          <div className='pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-copy-black/5' />
          <div className='pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-copy-black/5' />

          <p className='text-copy-black/60 text-xs font-semibold font-mono uppercase tracking-widest mb-4 relative'>
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
        </div>
      </Reveal>

    </main>
  )
}
