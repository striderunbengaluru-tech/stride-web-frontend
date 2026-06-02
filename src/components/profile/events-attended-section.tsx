import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin, ChevronRight, Footprints } from 'lucide-react'

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
  totalCount: number
  asList: boolean
  isOwnProfile: boolean
}

function formatEventDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function firstBanner(raw: string | null): string | null {
  try {
    const arr = JSON.parse(raw ?? '[]') as string[]
    return arr[0] ?? null
  } catch {
    return null
  }
}

export function EventsAttendedSection({ events, totalCount, asList, isOwnProfile }: Props) {
  return (
    <section>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className='h-4 w-1 bg-stride-yellow-accent rounded-full' aria-hidden='true' />
          <h2 className='text-white font-semibold text-sm tracking-wide'>Runs with Stride</h2>
        </div>
        {totalCount > 0 && (
          <span className='text-white/30 text-xs'>
            {totalCount > 10 ? 'Latest 10 · ' : ''}{totalCount} {totalCount === 1 ? 'run' : 'runs'}
          </span>
        )}
      </div>

      {/* Empty state */}
      {events.length === 0 ? (
        <div className='border border-dashed border-white/12 rounded-2xl p-8 text-center'>
          <Footprints size={22} className='text-white/15 mx-auto mb-2' />
          <p className='text-white/25 text-sm'>
            {isOwnProfile ? 'Your Stride runs appear here once you check in at an event.' : 'No Stride runs attended yet.'}
          </p>
        </div>
      ) : asList ? (
        /* List view — when more than 10 runs */
        <div className='flex flex-col divide-y divide-white/8'>
          {events.map(event => {
            const bannerUrl = firstBanner(event.banner_images)
            const dateStr = formatEventDate(event.event_date)
            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className='group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0'
              >
                <div className='relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white/5'>
                  {bannerUrl ? (
                    <Image src={bannerUrl} alt={event.name} fill className='object-cover' sizes='48px' />
                  ) : (
                    <div className='absolute inset-0 bg-linear-to-br from-stride-purple-primary to-stride-yellow-accent/20' />
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='text-white font-medium text-sm leading-snug truncate group-hover:text-stride-yellow-accent transition-colors'>{event.name}</p>
                  {dateStr && (
                    <span className='flex items-center gap-1 text-white/35 text-xs mt-0.5'>
                      <Calendar size={9} />
                      {dateStr}
                    </span>
                  )}
                </div>
                <ChevronRight size={15} className='text-white/20 group-hover:text-white/50 transition-colors shrink-0' />
              </Link>
            )
          })}
        </div>
      ) : (
        /* Mini cards — 10 or fewer runs */
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'>
          {events.map(event => {
            const bannerUrl = firstBanner(event.banner_images)
            const dateStr = formatEventDate(event.event_date)
            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className='group rounded-xl overflow-hidden border border-white/10 hover:border-stride-yellow-accent/40 transition-all bg-white/5 block'
              >
                <div className='relative aspect-square bg-white/5'>
                  {bannerUrl ? (
                    <Image
                      src={bannerUrl}
                      alt={event.name}
                      fill
                      className='object-cover transition-transform duration-500 group-hover:scale-105'
                      sizes='(max-width: 640px) 50vw, 200px'
                    />
                  ) : (
                    <div className='absolute inset-0 bg-linear-to-br from-stride-purple-primary to-stride-yellow-accent/20' />
                  )}
                  <span className='absolute top-1.5 right-1.5 bg-stride-yellow-accent text-copy-black text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider'>
                    Attended
                  </span>
                </div>
                <div className='p-2.5'>
                  <p className='text-white font-semibold text-xs leading-snug line-clamp-2'>{event.name}</p>
                  {dateStr && (
                    <span className='flex items-center gap-1 text-white/40 text-[11px] mt-1'>
                      <Calendar size={9} />
                      {dateStr}
                    </span>
                  )}
                  {event.location && (
                    <span className='flex items-center gap-1 text-white/30 text-[11px] mt-0.5 truncate'>
                      <MapPin size={9} />
                      {event.location}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
