import { adminClient } from '@/lib/supabase/admin'
import { EventCard } from '@/components/events/event-card'

export const metadata = {
  title: 'Events — Stride Run Club',
}

export default async function EventsPage() {
  const { data: allEvents } = await adminClient
    .from('events')
    .select('id, name, subtitle, slug, event_date, location, price_paise, status, cover_url')
    .eq('status', 'PUBLISHED')
    .order('event_date', { ascending: true })

  const events = allEvents ?? []

  return (
    <main className='min-h-screen pt-24'>
      <section className='container mx-auto px-6 py-16'>
        <h1 className='text-5xl font-bold mb-3'>Events</h1>
        <p className='text-white/60 text-lg mb-12'>
          Races, group runs, and community meetups — all in one place.
        </p>

        {events.length === 0 ? (
          <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-16 text-center'>
            <p className='text-white/40 text-lg'>No upcoming events right now.</p>
            <p className='text-white/30 text-sm mt-2'>Check back soon — we run regularly!</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {events.map((event) => (
              <EventCard
                key={event.id}
                name={event.name}
                subtitle={event.subtitle}
                slug={event.slug}
                eventDate={event.event_date}
                location={event.location}
                pricePaise={event.price_paise}
                status={event.status}
                coverUrl={event.cover_url}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
