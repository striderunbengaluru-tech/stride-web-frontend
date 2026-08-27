import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { HighlightedText } from '@/components/ui/highlighted-text'
import { listEvents as listUpcomingEvents } from '@/lib/mcp/data'
import { FREE_LABEL } from '@/lib/utils/money'
import { formatDateTimeIST } from '@/lib/utils/ist'
import { DEFAULT_OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from '@/lib/seo'
import { JsonLd } from '@/components/seo/json-ld'
import {
  graph,
  membershipServiceNode,
  breadcrumbNode,
  websiteId,
  organizationId,
} from '@/lib/json-ld'
import { PRODUCTION_SITE_URL } from '@/lib/site-url'

/**
 * What Stride costs, in one place.
 *
 * Every price on this page comes from `eventRowPriceLabel` reading the same
 * `events` rows the listing cards read, so the page cannot claim a price the
 * event page contradicts. There is no hardcoded number here beyond "free",
 * which is a fact about membership rather than a price.
 *
 * Machine-readable twin at /pricing.md. The `Offer` JSON-LD below is what lets
 * an assistant answer "how much is Stride" without reading any of this prose.
 */

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Stride Run Club membership is free. Most community runs are free to attend; some curated experiences carry a registration fee, always shown on the event page.',
  keywords: ['Stride Run Club pricing', 'run club membership fee', 'Bengaluru running club cost'],
  alternates: { canonical: '/pricing', types: { 'text/markdown': '/pricing.md' } },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Stride Run Club',
    url: '/pricing',
    title: 'Pricing — Stride Run Club',
    description: 'Membership is free. Most runs are free. Paid experiences show their price up front.',
    images: [{ url: DEFAULT_OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: 'Stride Run Club pricing' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — Stride Run Club',
    description: 'Membership is free. Most runs are free.',
    images: [DEFAULT_OG_IMAGE],
  },
}

// Membership is not a paid product, so ISR on the events table is the only thing
// that needs to stay fresh here. One hour: prices change when an admin edits an
// event, and the events page itself is tagged-cached on the same reads.
export const revalidate = 3600

const INCLUDED = [
  'An athlete profile at /profile/<username>',
  'A four-character Stride Tag for checking in at runs',
  'A run count that moves you through the five milestone tiers',
  'Access to the Stride WhatsApp community after your first run',
  'Entry to every free community run — two to three a week',
] as const

export default async function PricingPage() {
  // Via the shared `listEvents` rather than filtering here: it already applies
  // the upcoming/past split and the price labelling that every other surface
  // uses, and it does the `Date.now()` comparison outside the render pass —
  // calling an impure function during render is what the react-hooks rule
  // catches, and it would also make this page's ISR output depend on when the
  // render happened rather than on the data.
  const { events: upcomingEvents } = await listUpcomingEvents({ when: 'upcoming', limit: 100 }, false)

  const upcoming = upcomingEvents.map(event => ({
    slug: event.slug,
    name: event.name,
    when: event.eventDate ? formatDateTimeIST(event.eventDate) : 'Date to be announced',
    price: event.priceLabel,
  }))

  const paidCount = upcoming.filter(e => e.price !== FREE_LABEL && e.price !== 'Free to apply').length

  // The machine-readable answer to "how much does Stride cost". `Offer` with
  // `price: '0'` and a currency, not a missing price — an absent price reads as
  // "unknown", which is the opposite of what this page says.
  const jsonLd = graph([
    membershipServiceNode(PRODUCTION_SITE_URL),
    breadcrumbNode(PRODUCTION_SITE_URL, [{ name: 'Pricing', path: '/pricing' }]),
    {
      '@type': 'WebPage',
      '@id': `${PRODUCTION_SITE_URL}/pricing#webpage`,
      url: `${PRODUCTION_SITE_URL}/pricing`,
      name: 'Pricing — Stride Run Club',
      description:
        'Stride Run Club membership is free. Most community runs are free to attend; some curated experiences carry a registration fee.',
      inLanguage: 'en-IN',
      isPartOf: { '@id': websiteId(PRODUCTION_SITE_URL) },
      about: { '@id': organizationId(PRODUCTION_SITE_URL) },
      breadcrumb: { '@id': `${PRODUCTION_SITE_URL}/pricing#breadcrumb` },
    },
  ])

  return (
    <main className='min-h-screen'>
      <JsonLd data={jsonLd} />
      <section className='px-6 pt-28 pb-12 max-w-4xl mx-auto'>
        <span className='inline-block text-xs font-mono uppercase tracking-widest text-stride-yellow-accent font-medium mb-6 px-3 py-1 rounded-full border border-stride-yellow-accent/30 bg-stride-yellow-accent/10'>
          Pricing
        </span>
        <h1 className='text-4xl md:text-6xl font-bold font-libre text-copy-white mb-6 leading-tight'>
          <HighlightedText text='Membership is **free.**' />
        </h1>
        <p className='text-copy-white/70 text-lg md:text-xl leading-relaxed max-w-2xl'>
          There is no membership fee, no subscription and no tier you can buy. Most Stride
          runs are free to turn up to. A few curated experiences carry a registration fee,
          and it is always shown before you register.
        </p>
      </section>

      {/* Membership */}
      <section className='px-6 pb-12 max-w-4xl mx-auto'>
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-6 py-8 md:px-10 md:py-10'>
          <div className='flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-6'>
            <h2 className='text-2xl md:text-3xl font-bold font-libre text-copy-white'>
              Stride membership
            </h2>
            <p className='text-3xl md:text-4xl font-bold font-libre text-stride-yellow-accent'>
              ₹0
              <span className='text-base font-body font-normal text-copy-white/50'> / forever</span>
            </p>
          </div>
          <ul className='space-y-3 mb-8'>
            {INCLUDED.map(item => (
              <li key={item} className='flex gap-3 text-copy-white/70 leading-relaxed'>
                <span aria-hidden='true' className='text-stride-yellow-accent shrink-0'>—</span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href='/become-a-member'
            className='inline-flex items-center justify-center gap-2 min-h-11 bg-stride-yellow-accent text-copy-black font-bold px-6 py-3 rounded-md hover:opacity-90 transition-opacity'
          >
            Sign up free
            <ArrowRight className='size-4' aria-hidden='true' />
          </Link>
        </div>
      </section>

      {/* How event pricing works */}
      <section className='px-6 py-10 max-w-3xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-6'>
          How event pricing works
        </h2>
        <dl className='space-y-6 text-copy-white/70 leading-relaxed'>
          <div>
            <dt className='text-copy-white font-semibold mb-1'>Free community runs</dt>
            <dd>
              The weekly runs. No fee, no registration cap beyond the venue&rsquo;s. Just
              register so we know to expect you.
            </dd>
          </div>
          <div>
            <dt className='text-copy-white font-semibold mb-1'>Paid experiences</dt>
            <dd>
              Curated events — races, collaborations, anything with kit, a venue booking or a
              partner activation — carry a single registration fee shown on the event page in
              rupees.
            </dd>
          </div>
          <div>
            <dt className='text-copy-white font-semibold mb-1'>Packages</dt>
            <dd>
              Some events offer tiers instead of one price. Where the tiers differ, the listing
              shows the cheapest as <span className='font-mono'>From ₹X</span> and the event
              page breaks down each one.
            </dd>
          </div>
          <div>
            <dt className='text-copy-white font-semibold mb-1'>Invite-only events</dt>
            <dd>
              Registering submits a free application. Stride reviews every application and
              selects the athletes; nothing is charged.
            </dd>
          </div>
          <div>
            <dt className='text-copy-white font-semibold mb-1'>Coupons</dt>
            <dd>
              Selected paid events accept a coupon code for a percentage discount. The
              discounted total is shown before payment.
            </dd>
          </div>
          <div>
            <dt className='text-copy-white font-semibold mb-1'>Refunds</dt>
            <dd>
              Governed by the{' '}
              <Link href='/terms-of-service' className='text-stride-yellow-accent hover:underline'>
                terms of service
              </Link>
              , plus any event-specific terms shown at registration.
            </dd>
          </div>
        </dl>
      </section>

      {/* Live prices */}
      <section className='px-6 py-10 pb-20 max-w-4xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-3'>
          What&rsquo;s priced right now
        </h2>
        <p className='text-copy-white/50 mb-8'>
          {upcoming.length > 0
            ? `${upcoming.length} upcoming ${upcoming.length === 1 ? 'event' : 'events'}, ${paidCount} of them paid.`
            : 'No upcoming events are open for registration.'}
        </p>

        {upcoming.length > 0 ? (
          <div className='overflow-x-auto'>
            <table className='w-full text-left border-collapse'>
              <caption className='sr-only'>
                Upcoming Stride Run Club events and their registration prices
              </caption>
              <thead>
                <tr className='border-b border-white/15'>
                  <th scope='col' className='py-3 pr-4 text-xs font-mono uppercase tracking-wide text-copy-white/40 font-medium'>
                    Event
                  </th>
                  <th scope='col' className='py-3 pr-4 text-xs font-mono uppercase tracking-wide text-copy-white/40 font-medium whitespace-nowrap'>
                    When
                  </th>
                  <th scope='col' className='py-3 text-xs font-mono uppercase tracking-wide text-copy-white/40 font-medium whitespace-nowrap'>
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(event => (
                  <tr key={event.slug} className='border-b border-white/10'>
                    <td className='py-4 pr-4'>
                      <Link
                        href={`/events/${event.slug}`}
                        className='text-copy-white hover:text-stride-yellow-accent transition-colors line-clamp-2'
                      >
                        {event.name}
                      </Link>
                    </td>
                    <td className='py-4 pr-4 text-copy-white/50 text-sm'>{event.when}</td>
                    <td className='py-4 font-semibold text-stride-yellow-accent whitespace-nowrap'>
                      {event.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className='text-copy-white/60'>
            New dates go up on the{' '}
            <Link href='/events' className='text-stride-yellow-accent hover:underline'>
              events page
            </Link>
            .
          </p>
        )}
      </section>
    </main>
  )
}
