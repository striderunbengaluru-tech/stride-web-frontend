'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { MapPin, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'

type EventCardProps = {
  name: string
  subtitle: string | null
  slug: string
  eventDate: Date | null
  location: string | null
  pricePaise: number
  coverUrl: string | null
}

function useCountdown(eventDate: Date | null): string | null {
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    if (!eventDate) return

    function calc() {
      const diff = eventDate!.getTime() - Date.now()
      if (diff <= 0) { setText(null); return }
      if (diff < 3_600_000) {
        const mins = Math.floor(diff / 60_000)
        setText(`In ${mins}m`)
      } else if (diff < 86_400_000) {
        const hrs = Math.floor(diff / 3_600_000)
        setText(`In ${hrs}h`)
      } else if (diff < 7 * 86_400_000) {
        const days = Math.floor(diff / 86_400_000)
        setText(days === 1 ? 'Tomorrow' : `In ${days}d`)
      } else {
        setText(null)
      }
    }

    calc()
    const interval = setInterval(calc, 60_000)
    return () => clearInterval(interval)
  }, [eventDate])

  return text
}

export function EventCard({ name, subtitle, slug, eventDate, location, pricePaise, coverUrl }: EventCardProps) {
  const countdown = useCountdown(eventDate)
  const isPast = eventDate ? eventDate < new Date() : false

  const dateStr = eventDate
    ? eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <Link
        href={`/events/${slug}`}
        className='group block bg-white/8 border border-white/10 rounded-2xl overflow-hidden hover:border-stride-yellow-accent/40 transition-colors duration-300'
      >
        {/* Clean image — 3:4 portrait, no text overlay */}
        <div className='relative aspect-3/4 bg-linear-to-br from-stride-purple-primary to-stride-yellow-accent/15 overflow-hidden'>
          {coverUrl && (
            <Image
              src={coverUrl}
              alt={name}
              fill
              className='object-cover group-hover:scale-105 transition-transform duration-500'
              sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            />
          )}

          {/* Status badge — top-left */}
          <div className='absolute top-3 left-3'>
            {!isPast && countdown ? (
              <span className='bg-stride-yellow-accent text-copy-black text-xs font-bold px-2.5 py-1 rounded-full'>
                {countdown}
              </span>
            ) : isPast ? (
              <span className='bg-black/40 backdrop-blur-sm text-white/60 text-xs font-medium px-2.5 py-1 rounded-full border border-white/15'>
                Completed
              </span>
            ) : null}
          </div>

          {/* Price badge — top-right */}
          <div className='absolute top-3 right-3'>
            {pricePaise === 0 ? (
              <span className='bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full'>
                Free
              </span>
            ) : (
              <span className='bg-black/40 backdrop-blur-sm border border-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full'>
                ₹{(pricePaise / 100).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* Text content — below image */}
        <div className='px-4 py-3.5'>
          <h2 className='text-white font-bold text-base leading-snug line-clamp-2 group-hover:text-stride-yellow-accent transition-colors duration-200'>
            {name}
          </h2>
          {subtitle && (
            <p className='text-white/45 text-sm mt-0.5 line-clamp-1'>{subtitle}</p>
          )}
          <div className='mt-2.5 flex flex-wrap gap-x-3 gap-y-1'>
            {dateStr && (
              <span className='flex items-center gap-1 text-white/40 text-xs'>
                <Calendar size={10} />
                {dateStr}
              </span>
            )}
            {location && (
              <span className='flex items-center gap-1 text-white/40 text-xs line-clamp-1'>
                <MapPin size={10} />
                {location}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
