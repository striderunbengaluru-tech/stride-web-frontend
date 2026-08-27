import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { HighlightedText } from '@/components/ui/highlighted-text'
import { MILESTONE_TIERS } from '@/lib/milestones'
import { LEAD_STRIDERS } from '@/content/lead-striders'
import { DEFAULT_OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from '@/lib/seo'
import { JsonLd } from '@/components/seo/json-ld'
import { graph, breadcrumbNode, organizationId, websiteId } from '@/lib/json-ld'
import { PRODUCTION_SITE_URL } from '@/lib/site-url'

/**
 * The trust-anchor About page.
 *
 * Every fact here comes from `stride_runclub_context.md` — the repo's own brand
 * context file, compiled from the club's Instagram — or from data already on the
 * site (`MILESTONE_TIERS`, `LEAD_STRIDERS`). Nothing is invented: an About page
 * is exactly what people and AI assistants read to decide whether a club is
 * real, so a wrong number here is worse than a missing one.
 */

export const metadata: Metadata = {
  title: 'About Stride Run Club',
  description:
    "Stride Run Club is Bengaluru's running community — 5,754 runners in 2025, 97 community runs, 63% of them first-timers. How it started, how a run works, and what membership means.",
  keywords: ['about Stride Run Club', 'running club Bengaluru', 'run club history', 'Move as one'],
  alternates: { canonical: '/about', types: { 'text/markdown': '/about.md' } },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Stride Run Club',
    url: '/about',
    title: 'About Stride Run Club',
    description:
      "From three runners to a city-wide movement. What Stride is, how a run works, and why membership is free.",
    images: [{ url: DEFAULT_OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: 'Stride Run Club Bengaluru' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Stride Run Club',
    description: 'From three runners to a city-wide movement in Bengaluru.',
    images: [DEFAULT_OG_IMAGE],
  },
}

const STATS = [
  { value: '5,754', label: 'runners in 2025' },
  { value: '63%', label: 'were first-timers' },
  { value: '97', label: 'community runs in 2025' },
  { value: '52K+', label: 'on Instagram' },
] as const

const jsonLd = graph([
  {
    '@type': 'AboutPage',
    '@id': `${PRODUCTION_SITE_URL}/about#webpage`,
    url: `${PRODUCTION_SITE_URL}/about`,
    name: 'About Stride Run Club',
    description:
      "Stride Run Club is Bengaluru's running community — 5,754 runners in 2025, 97 community runs, 63% of them first-timers.",
    inLanguage: 'en-IN',
    isPartOf: { '@id': websiteId(PRODUCTION_SITE_URL) },
    // `mainEntity`, not merely `about`: this page's subject IS the organisation,
    // which is what makes it usable as the trust anchor a consumer checks.
    mainEntity: { '@id': organizationId(PRODUCTION_SITE_URL) },
    breadcrumb: { '@id': `${PRODUCTION_SITE_URL}/about#breadcrumb` },
  },
  breadcrumbNode(PRODUCTION_SITE_URL, [{ name: 'About', path: '/about' }]),
])

export default function AboutPage() {
  return (
    <main className='min-h-screen'>
      <JsonLd data={jsonLd} />
      <section className='px-6 pt-28 pb-12 md:pb-16 max-w-4xl mx-auto'>
        <span className='inline-block text-xs font-mono uppercase tracking-widest text-stride-yellow-accent font-medium mb-6 px-3 py-1 rounded-full border border-stride-yellow-accent/30 bg-stride-yellow-accent/10'>
          About
        </span>
        <h1 className='text-4xl md:text-6xl font-bold font-libre text-copy-white mb-6 leading-tight'>
          <HighlightedText text='We started with **three runners.**' />
        </h1>
        <p className='text-copy-white/70 text-lg md:text-xl leading-relaxed'>
          Stride Run Club is a running community in Bengaluru. It began as three people
          meeting to run and grew into a club that puts on two to three runs a week, every
          week — from beginner-friendly 5Ks to hill repeats, interval sessions and long runs.
          At peak, more than 300 people have turned up for a single Stride run.
        </p>
      </section>

      <section className='px-6 pb-12 max-w-4xl mx-auto'>
        <dl className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {STATS.map(({ value, label }) => (
            <div
              key={label}
              className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-5 py-6'
            >
              <dt className='sr-only'>{label}</dt>
              <dd>
                <p className='text-2xl md:text-3xl font-bold font-libre text-stride-yellow-accent mb-1'>
                  {value}
                </p>
                <p className='text-copy-white/50 text-xs font-mono uppercase tracking-wide'>
                  {label}
                </p>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className='px-6 py-10 max-w-3xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-5'>
          What &ldquo;Move as one&rdquo; means
        </h2>
        <p className='text-copy-white/70 text-lg leading-relaxed mb-5'>
          It means nobody gets dropped. Stride is deliberately not a race team — 63% of the
          people who ran with us in 2025 had never run with a club before, and the run is
          built around that. You can walk it, jog it or chase a personal best, and all three
          finish in the same place.
        </p>
        <p className='text-copy-white/70 text-lg leading-relaxed'>
          It also means the run is only half of it. A Stride event is a run and a social
          mixer: guided warm-ups from certified trainers, icebreakers, and coffee or
          breakfast afterwards. People come alone and leave with a group chat.
        </p>
      </section>

      <section className='px-6 py-10 max-w-3xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-5'>
          How a Stride run works
        </h2>
        <ol className='space-y-4 text-copy-white/70 text-lg leading-relaxed'>
          <li>
            <span className='text-copy-white font-semibold'>1. Find a run.</span> Every run,
            race and meetup is listed on the{' '}
            <Link href='/events' className='text-stride-yellow-accent hover:underline'>
              events page
            </Link>{' '}
            with its date, start point, distance and price.
          </li>
          <li>
            <span className='text-copy-white font-semibold'>2. Register.</span> Most community
            runs are free. Some curated experiences carry a fee, always shown up front — see{' '}
            <Link href='/pricing' className='text-stride-yellow-accent hover:underline'>
              pricing
            </Link>
            .
          </li>
          <li>
            <span className='text-copy-white font-semibold'>3. Check in on the day.</span> Every
            member gets a four-character <span className='font-mono'>Stride Tag</span>. Read it
            out at the start line and your run is counted.
          </li>
          <li>
            <span className='text-copy-white font-semibold'>4. Move up a tier.</span> Runs
            attended drive the{' '}
            <Link href='/milestones' className='text-stride-yellow-accent hover:underline'>
              {MILESTONE_TIERS.length} milestone tiers
            </Link>
            , from {MILESTONE_TIERS[0].label} to {MILESTONE_TIERS[MILESTONE_TIERS.length - 1].label}.
            Nothing about them can be bought.
          </li>
        </ol>
      </section>

      <section className='px-6 py-10 max-w-3xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-5'>
          Who runs the club
        </h2>
        <p className='text-copy-white/70 text-lg leading-relaxed mb-5'>
          Stride is organised by {LEAD_STRIDERS.length} Lead Striders — the people who plot the
          routes, set the pace and are at the start line before anyone else. Stride Run Club is
          based in Bengaluru, Karnataka, India, and every run happens in the city.
        </p>
        <div className='flex flex-col sm:flex-row gap-3'>
          <Link
            href='/team'
            className='inline-flex items-center justify-center gap-2 min-h-11 bg-stride-yellow-accent text-copy-black font-bold px-6 py-3 rounded-md hover:opacity-90 transition-opacity'
          >
            Meet the Lead Striders
            <ArrowRight className='size-4' aria-hidden='true' />
          </Link>
          <Link
            href='/contact-us'
            className='inline-flex items-center justify-center gap-2 min-h-11 border border-white/15 bg-white/10 backdrop-blur-md text-copy-white font-semibold px-6 py-3 rounded-md hover:border-stride-yellow-accent/50 transition-colors'
          >
            Contact us
          </Link>
        </div>
      </section>

      <section className='px-6 py-10 pb-20 max-w-3xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-5'>
          Membership is free
        </h2>
        <p className='text-copy-white/70 text-lg leading-relaxed'>
          There is no membership fee and no tier you can pay to skip. Signing up creates an
          athlete profile and a Stride Tag, and you can delete both at any time — what we hold
          and how to remove it is set out in the{' '}
          <Link href='/privacy-policy' className='text-stride-yellow-accent hover:underline'>
            privacy policy
          </Link>
          . The site itself is open source:{' '}
          <a
            href='https://github.com/striderunbengaluru-tech/stride-web-frontend'
            target='_blank'
            rel='noopener noreferrer'
            className='text-stride-yellow-accent hover:underline'
          >
            github.com/striderunbengaluru-tech/stride-web-frontend
          </a>
          .
        </p>
      </section>
    </main>
  )
}
