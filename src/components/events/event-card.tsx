import Link from 'next/link'
import Image from 'next/image'

type EventCardProps = {
  name: string
  subtitle: string | null
  slug: string
  eventDate: Date | null
  location: string | null
  pricePaise: number
  status: string
  coverUrl: string | null
}

export function EventCard({ name, subtitle, slug, eventDate, location, pricePaise, coverUrl }: EventCardProps) {
  const dateStr = eventDate
    ? new Date(eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <Link
      href={`/events/${slug}`}
      className='group block bg-white/10 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden hover:border-stride-yellow-accent/50 transition-colors'
    >
      {/* Cover */}
      <div className='relative h-40 bg-gradient-to-br from-stride-purple-primary to-stride-yellow-accent/20'>
        {coverUrl && (
          <Image
            src={coverUrl}
            alt={name}
            fill
            className='object-cover group-hover:scale-105 transition-transform duration-500'
            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
          />
        )}
        <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
        <span className='absolute top-3 left-3 text-xs font-bold uppercase tracking-widest text-stride-yellow-accent bg-black/40 px-2.5 py-1 rounded-md'>
          {pricePaise === 0 ? 'Free' : `₹${pricePaise / 100}`}
        </span>
      </div>

      <div className='p-5'>
        <h2 className='text-white font-bold text-lg line-clamp-1 group-hover:text-stride-yellow-accent transition-colors'>{name}</h2>
        {subtitle && <p className='text-white/60 text-sm mt-0.5 line-clamp-1'>{subtitle}</p>}
        <div className='mt-3 flex flex-col gap-1'>
          {dateStr && <p className='text-white/50 text-xs'>📅 {dateStr}</p>}
          {location && <p className='text-white/50 text-xs'>📍 {location}</p>}
        </div>
      </div>
    </Link>
  )
}
