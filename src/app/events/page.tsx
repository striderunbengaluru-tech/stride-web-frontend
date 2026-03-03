import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { EventCard } from '@/components/events/event-card'

export const metadata = {
  title: 'Events — Stride Run Club',
}

export default async function EventsPage() {
  const allEvents = await db
    .select({
      id: events.id,
      name: events.name,
      subtitle: events.subtitle,
      slug: events.slug,
      eventDate: events.eventDate,
      location: events.location,
      pricePaise: events.pricePaise,
      status: events.status,
      coverUrl: events.coverUrl,
    })
    .from(events)
    .where(eq(events.status, 'PUBLISHED'))
    .orderBy(asc(events.eventDate))

  return (
    <main className='min-h-screen pt-24'>
      <section className='container mx-auto px-6 py-16'>
        <h1 className='text-5xl font-bold mb-3'>Events</h1>
        <p className='text-white/60 text-lg mb-12'>
          Races, group runs, and community meetups — all in one place.
        </p>

        {allEvents.length === 0 ? (
          <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-16 text-center'>
            <p className='text-white/40 text-lg'>No upcoming events right now.</p>
            <p className='text-white/30 text-sm mt-2'>Check back soon — we run regularly!</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {allEvents.map((event) => (
              <EventCard
                key={event.id}
                name={event.name}
                subtitle={event.subtitle}
                slug={event.slug}
                eventDate={event.eventDate}
                location={event.location}
                pricePaise={event.pricePaise}
                status={event.status}
                coverUrl={event.coverUrl}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
