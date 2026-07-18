import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin } from 'lucide-react'
import { getPublishedEvents } from '@/lib/data/events'
import { EventsClient } from '@/components/events/events-client'
import { EventCountdown } from '@/components/events/event-countdown'
import { TrackBackdrop } from '@/components/ui/track-backdrop'

export const metadata: Metadata = {
  title: 'Events - Stride Run Club',
  description: 'Every Stride run, race, and meetup in one place.',
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
}

function formatEventDateIST(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

// District-style featured banner for the soonest upcoming event.
function UpNextBanner({ event }: { event: EventRow }) {
  const priceLabel = event.price_paise === 0 ? 'Free' : `₹${(event.price_paise / 100).toLocaleString('en-IN')}`

  return (
    <Link href={`/events/${event.slug}`} className='group block mb-14'>
      <div className='grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px] bg-white/6 backdrop-blur-md border border-white/12 rounded-2xl overflow-hidden hover:border-stride-yellow-accent/50 transition-colors'>
        {/* Image — posters are always 3:4 (admin crops to 3:4), so the column
            is a fixed 3:4 frame the poster fills exactly: no letterbox gap */}
        <div className='relative aspect-3/4 md:order-2 bg-white/5 overflow-hidden'>
          {event.imageUrl && (
            <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              sizes='(max-width: 768px) 100vw, 340px'
              className='object-cover group-hover:scale-[1.02] transition-transform duration-500'
              priority
            />
          )}
        </div>

        {/* Content */}
        <div className='p-6 sm:p-8 flex flex-col justify-center gap-4 md:order-1'>
          <p className='text-stride-yellow-accent text-xs font-bold font-mono uppercase tracking-[0.25em]'>
            Up next
          </p>
          <div>
            <h2 className='text-2xl sm:text-3xl font-bold text-white leading-tight line-clamp-2'>{event.name}</h2>
            {event.subtitle && (
              <p className='text-white/50 text-sm mt-2 line-clamp-2'>{event.subtitle}</p>
            )}
          </div>

          <div className='flex flex-col gap-2 text-sm text-white/70'>
            {event.event_date && (
              <span className='inline-flex items-center gap-2'>
                <Calendar size={15} className='text-stride-yellow-accent/70 shrink-0' />
                {formatEventDateIST(event.event_date)}
              </span>
            )}
            {event.location && (
              <span className='inline-flex items-center gap-2'>
                <MapPin size={15} className='text-stride-yellow-accent/70 shrink-0' />
                <span className='line-clamp-1'>{event.location}</span>
              </span>
            )}
          </div>

          {/* Live countdown to the start — min-height reserves the slot so the
              client-only timer doesn't shift the layout when it mounts */}
          {event.event_date && (
            <div className='min-h-[88px]'>
              <EventCountdown eventDate={event.event_date} label='Starts in' />
            </div>
          )}

          <div className='flex items-center gap-4 pt-1'>
            <span className='inline-flex items-center bg-stride-yellow-accent text-copy-black font-bold text-sm px-5 py-2.5 rounded-md group-hover:scale-[1.02] group-active:scale-[0.98] transition-transform min-h-11'>
              View event
            </span>
            <span className='text-white font-semibold text-sm font-mono tabular-nums'>{priceLabel}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

async function fetchEventsData(): Promise<{ events: EventRow[]; upNext: EventRow | null }> {
  const allEvents = await getPublishedEvents()

  const events: EventRow[] = (allEvents ?? []).map(event => {
    let imageUrl: string | null = event.cover_url ?? null
    if (event.banner_images) {
      try {
        const arr = JSON.parse(event.banner_images) as string[]
        if (arr[0]) imageUrl = arr[0]
      } catch { /* keep cover_url fallback */ }
    }
    return { ...event, imageUrl }
  })

  // The soonest event that hasn't happened yet — events arrive date-ascending.
  const now = Date.now()
  const upNext = events.find(e => e.event_date && new Date(e.event_date).getTime() >= now) ?? null

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

        {upNext && <UpNextBanner event={upNext} />}

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
