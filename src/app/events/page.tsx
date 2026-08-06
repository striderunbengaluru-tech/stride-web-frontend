import type { Metadata } from 'next'
import { DEFAULT_OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from '@/lib/seo'
import { getPublishedEvents } from '@/lib/data/events'
import { eventRowPriceLabel, FREE_LABEL } from '@/lib/utils/money'
import { EventsClient } from '@/components/events/events-client'
import { UpNextCarousel } from '@/components/events/up-next-carousel'
import { TrackBackdrop } from '@/components/ui/track-backdrop'

// The title omits the brand: the root layout's title template appends
// " | Stride Run Club", and repeating it here produced
// "Events - Stride Run Club | Stride Run Club".
//
// openGraph/twitter are spelled out rather than left to inherit. A child that
// doesn't declare them takes the layout's objects wholesale, so shared links to
// this page previewed as the homepage — site-wide title, site-wide description,
// and an og:url pointing at "/".
export const metadata: Metadata = {
  title: 'Upcoming Runs & Events',
  description:
    'Every Stride run, race and meetup in Bengaluru. Two to three community runs a week, all fitness levels welcome — find your next start line and register.',
  keywords: ['Stride Run Club events', 'group runs Bengaluru', 'running events Bengaluru', 'run club calendar', '5K Bengaluru', '10K Bengaluru'],
  alternates: { canonical: '/events' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Stride Run Club',
    url: '/events',
    title: 'Upcoming Runs & Events — Stride Run Club',
    description:
      'Two to three community runs a week across Bengaluru, and every race we show up for. All fitness levels welcome.',
    images: [{ url: DEFAULT_OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: 'Stride Run Club — upcoming runs and events' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Upcoming Runs & Events — Stride Run Club',
    description: 'Two to three community runs a week across Bengaluru. All fitness levels welcome.',
    images: [DEFAULT_OG_IMAGE],
  },
}

// ISR: rebuilt in the background at most every 60s, and purged instantly by
// admin event actions via revalidateTag('events').
export const revalidate = 60

type EventRow = {
  id: string
  name: string
  subtitle: string | null
  slug: string
  event_date: string | null
  location: string | null
  price_paise: number
  cover_url: string | null
  imageUrl: string | null
  /** Registering is a free application Stride approves. */
  invite_only: boolean | null
  /**
   * Resolved here rather than in the card: the packages live in a JSON column,
   * and deriving the label server-side keeps the parse off the client and
   * guarantees the card agrees with the detail page.
   */
  priceLabel: string
  isFree: boolean
}

async function fetchEventsData(): Promise<{ events: EventRow[]; upNext: EventRow[] }> {
  const allEvents = await getPublishedEvents()

  const events: EventRow[] = (allEvents ?? []).map(event => {
    let imageUrl: string | null = event.cover_url ?? null
    if (event.banner_images) {
      try {
        const arr = JSON.parse(event.banner_images) as string[]
        if (arr[0]) imageUrl = arr[0]
      } catch { /* keep cover_url fallback */ }
    }
    const priceLabel = eventRowPriceLabel(event.price_paise, event.packages, event.packages_enabled)
    return { ...event, imageUrl, priceLabel, isFree: priceLabel === FREE_LABEL }
  })

  // Every event still ahead of us, soonest first — the carousel rotates through
  // them, and falls back to a plain banner when there's only one.
  const now = Date.now()
  const upNext = events
    .filter(e => e.event_date && new Date(e.event_date).getTime() >= now)
    .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime())

  return { events, upNext }
}

export default async function EventsPage() {
  const { events, upNext } = await fetchEventsData()

  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-hidden'>

      <TrackBackdrop />

      <section className='relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-24'>

        {/* Header */}
        <div className='mb-12'>
          <h1 className='text-6xl sm:text-7xl font-bold text-white leading-[0.95] tracking-tight'>
            Events
          </h1>
          <p className='text-white/45 text-lg mt-5 max-w-md leading-relaxed'>
            Everything Stride hosts across Bengaluru, from weekly group runs to race day. Pick one and show up.
          </p>
        </div>

        {upNext.length > 0 && (
          <div className='mb-14'>
            <UpNextCarousel events={upNext} imagePriority />
          </div>
        )}

        {/* All events */}
        <div className='flex items-center gap-2 mb-6'>
          <div className='h-4 w-1 bg-stride-yellow-accent rounded-full' aria-hidden='true' />
          <h2 className='text-white font-semibold text-lg'>All events</h2>
        </div>

        <EventsClient events={events} />
      </section>
    </main>
  )
}
