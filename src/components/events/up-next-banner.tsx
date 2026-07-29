import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin } from 'lucide-react'
import { AnimatedNumberCountdown } from '@/components/ui/countdown-number'

// Featured banner for the soonest upcoming run. Shared by the events page and
// the homepage's "Up next" section so the two can't drift apart.

// Structural shape — `EventListRow` and the events page's own row type both
// satisfy it, so callers can pass their existing objects unchanged.
export type UpNextEvent = {
  name: string
  subtitle: string | null
  slug: string
  event_date: string | null
  location: string | null
  price_paise: number
  imageUrl: string | null
}

export function formatEventDateIST(iso: string): string {
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

type Props = {
  event: UpNextEvent
  /** Only the first screenful of the events page should preload the poster. */
  imagePriority?: boolean
  /**
   * Renders the in-card "Up next" eyebrow. Off where the surrounding section
   * already carries that heading, so the words don't appear twice.
   */
  showLabel?: boolean
}

export function UpNextBanner({ event, imagePriority = false, showLabel = true }: Props) {
  const priceLabel =
    event.price_paise === 0 ? 'Free' : `₹${(event.price_paise / 100).toLocaleString('en-IN')}`

  return (
    <Link href={`/events/${event.slug}`} className='group block'>
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
              priority={imagePriority}
            />
          )}
        </div>

        {/* Content */}
        <div className='p-6 sm:p-8 flex flex-col justify-center gap-4 md:order-1'>
          {showLabel && (
            <p className='text-stride-yellow-accent text-xs font-bold font-mono uppercase tracking-[0.25em]'>
              Up next
            </p>
          )}
          <div>
            <h2 className='text-2xl sm:text-3xl font-bold text-white leading-tight line-clamp-2'>
              {event.name}
            </h2>
            {event.subtitle && (
              <p className='text-white/50 text-sm mt-2 line-clamp-2'>{event.subtitle}</p>
            )}
          </div>

          <div className='flex flex-col gap-2 text-sm text-white/70'>
            {event.event_date && (
              <span className='inline-flex items-center gap-2'>
                <Calendar size={15} className='text-stride-yellow-accent/70 shrink-0' aria-hidden='true' />
                {formatEventDateIST(event.event_date)}
              </span>
            )}
            {event.location && (
              <span className='inline-flex items-center gap-2'>
                <MapPin size={15} className='text-stride-yellow-accent/70 shrink-0' aria-hidden='true' />
                <span className='line-clamp-1'>{event.location}</span>
              </span>
            )}
          </div>

          {/* Live countdown to the start — min-height reserves the slot so the
              client-only timer doesn't shift the layout when it mounts */}
          {event.event_date && (
            <div className='min-h-23'>
              <AnimatedNumberCountdown
                endDate={new Date(event.event_date)}
                label='Starts in'
                size='lg'
              />
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
