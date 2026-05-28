import type { Metadata } from 'next'
import { adminClient } from '@/lib/supabase/admin'
import { EventsClient } from '@/components/events/events-client'

export const metadata: Metadata = {
  title: 'Events — Stride Run Club',
  description: 'Races, group runs, and community meetups — all in one place.',
}

export default async function EventsPage() {
  const { data: allEvents } = await adminClient
    .from('events')
    .select('id, name, subtitle, slug, event_date, location, price_paise, cover_url, banner_images')
    .eq('status', 'PUBLISHED')
    .order('event_date', { ascending: true })

  const events = (allEvents ?? []).map(event => {
    let imageUrl: string | null = event.cover_url ?? null
    if (event.banner_images) {
      try {
        const arr = JSON.parse(event.banner_images) as string[]
        if (arr[0]) imageUrl = arr[0]
      } catch { /* keep cover_url fallback */ }
    }
    return { ...event, imageUrl }
  })

  return (
    <main className='min-h-screen bg-stride-purple-primary pt-24 pb-20'>
      <section className='max-w-6xl mx-auto px-6'>
        {/* Header */}
        <div className='py-12'>
          <p className='text-stride-yellow-accent text-xs font-bold uppercase tracking-[0.2em] mb-3'>
            Stride Run Club
          </p>
          <h1 className='text-5xl sm:text-6xl font-bold text-white leading-tight'>
            Events
          </h1>
          <p className='text-white/50 text-lg mt-4 max-w-lg'>
            Races, group runs, and community meetups — all in one place.
          </p>
        </div>

        <EventsClient events={events} />
      </section>
    </main>
  )
}
