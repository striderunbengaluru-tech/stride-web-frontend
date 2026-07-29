import type { Metadata } from 'next'
import { getPublishedEvents } from '@/lib/data/events'
import { EventsClient } from '@/components/events/events-client'
import { UpNextBanner } from '@/components/events/up-next-banner'
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

        {upNext && (
          <div className='mb-14'>
            <UpNextBanner event={upNext} imagePriority />
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
