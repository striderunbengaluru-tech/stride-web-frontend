import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin } from 'lucide-react'

type AttendedEvent = {
  id: string
  name: string
  slug: string
  event_date: string | null
  location: string | null
  banner_images: string | null
}

type Props = {
  events: AttendedEvent[]
}

function formatEventDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function EventsAttendedSection({ events }: Props) {
  if (events.length === 0) return null

  return (
    <section className='mt-10'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className='h-4 w-1 bg-stride-yellow-accent rounded-full' aria-hidden='true' />
          <h2 className='text-white font-semibold text-sm tracking-wide'>Stride runs attended</h2>
        </div>
        <span className='text-white/30 text-xs'>{events.length} {events.length === 1 ? 'run' : 'runs'}</span>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        {events.map(event => {
          let bannerUrl: string | null = null
          try {
            const arr = JSON.parse(event.banner_images ?? '[]') as string[]
            bannerUrl = arr[0] ?? null
          } catch {}

          const dateStr = formatEventDate(event.event_date)

          return (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className='group relative rounded-2xl overflow-hidden border border-white/10 hover:border-stride-yellow-accent/40 transition-all bg-white/5 aspect-[4/5] block'
            >
              {/* Background image */}
              {bannerUrl ? (
                <Image
                  src={bannerUrl}
                  alt={event.name}
                  fill
                  className='object-cover transition-transform duration-500 group-hover:scale-105'
                  sizes='(max-width: 640px) 50vw, 300px'
                />
              ) : (
                <div className='absolute inset-0 bg-linear-to-br from-stride-purple-primary to-stride-yellow-accent/20' />
              )}

              {/* Gradient overlay */}
              <div className='absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent' />

              {/* Content */}
              <div className='absolute bottom-0 left-0 right-0 p-3'>
                <p className='text-white font-bold text-sm leading-snug line-clamp-2'>{event.name}</p>
                <div className='flex flex-col gap-0.5 mt-1.5'>
                  {dateStr && (
                    <span className='flex items-center gap-1 text-white/50 text-xs'>
                      <Calendar size={9} />
                      {dateStr}
                    </span>
                  )}
                  {event.location && (
                    <span className='flex items-center gap-1 text-white/40 text-xs truncate'>
                      <MapPin size={9} />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Attended badge */}
              <div className='absolute top-2.5 right-2.5'>
                <span className='bg-stride-yellow-accent text-copy-black text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider'>
                  Attended
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
