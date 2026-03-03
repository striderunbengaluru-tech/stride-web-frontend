import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { deleteEventAction } from '@/lib/actions/admin'

export const metadata = { title: 'Events — Admin' }

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-white/10 text-white/60',
  PUBLISHED: 'bg-stride-yellow-accent/20 text-stride-yellow-accent',
  CANCELLED: 'bg-red-500/20 text-red-400',
}

export default async function AdminEventsPage() {
  const allEvents = await db
    .select({
      id: events.id,
      name: events.name,
      slug: events.slug,
      status: events.status,
      eventDate: events.eventDate,
      capacity: events.capacity,
      pricePaise: events.pricePaise,
    })
    .from(events)
    .orderBy(desc(events.createdAt))

  return (
    <div>
      <div className='flex items-center justify-between mb-8'>
        <h1 className='text-3xl font-bold text-white'>Events</h1>
        <a
          href='/admin/events/new'
          className='bg-stride-yellow-accent text-stride-dark font-semibold px-5 py-2.5 rounded-md hover:bg-stride-yellow-accent/90 transition-colors text-sm min-h-11 flex items-center'
        >
          + New Event
        </a>
      </div>

      {allEvents.length === 0 ? (
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-12 text-center'>
          <p className='text-white/40'>No events yet. Create your first event.</p>
        </div>
      ) : (
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-white/10'>
                <th className='text-left text-white/50 font-medium px-6 py-4 uppercase tracking-wider text-xs'>Name</th>
                <th className='text-left text-white/50 font-medium px-6 py-4 uppercase tracking-wider text-xs'>Date</th>
                <th className='text-left text-white/50 font-medium px-6 py-4 uppercase tracking-wider text-xs'>Price</th>
                <th className='text-left text-white/50 font-medium px-6 py-4 uppercase tracking-wider text-xs'>Status</th>
                <th className='px-6 py-4' />
              </tr>
            </thead>
            <tbody>
              {allEvents.map((event) => (
                <tr key={event.id} className='border-b border-white/5 hover:bg-white/5 transition-colors'>
                  <td className='px-6 py-4'>
                    <p className='text-white font-medium line-clamp-1'>{event.name}</p>
                    <p className='text-white/40 text-xs mt-0.5'>{event.slug}</p>
                  </td>
                  <td className='px-6 py-4 text-white/60'>
                    {event.eventDate
                      ? new Date(event.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className='px-6 py-4 text-white/60'>
                    {event.pricePaise === 0 ? 'Free' : `₹${event.pricePaise / 100}`}
                  </td>
                  <td className='px-6 py-4'>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${STATUS_STYLES[event.status] ?? 'bg-white/10 text-white/60'}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className='px-6 py-4'>
                    <div className='flex gap-3 justify-end'>
                      <a href={`/admin/events/${event.id}/edit`} className='text-stride-yellow-accent hover:underline text-xs'>
                        Edit
                      </a>
                      <form action={deleteEventAction.bind(null, event.id)}>
                        <button type='submit' className='text-red-400 hover:underline text-xs'>
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
