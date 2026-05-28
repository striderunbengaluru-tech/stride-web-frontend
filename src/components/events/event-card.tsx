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
      whileHover={{ y: -5 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <Link
        href={`/events/${slug}`}
        className='group block bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl overflow-hidden hover:border-stride-yellow-accent/40 transition-colors duration-300'
      >
        {/* Image — 3:4 portrait */}
        <div className='relative aspect-3/4 bg-linear-to-br from-stride-purple-primary to-stride-yellow-accent/15 overflow-hidden'>
          {coverUrl && (
            <Image
              src={coverUrl}
              alt={name}
              fill
              className='object-cover group-hover:scale-105 transition-transform duration-600'
              sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            />
          )}

          {/* Gradient overlay */}
          <div className='absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent' />

          {/* Countdown badge — top-left (only if upcoming and within 7 days) */}
          {!isPast && countdown && (
            <div className='absolute top-3 left-3'>
              <span className='bg-stride-yellow-accent text-copy-black text-xs font-bold px-2.5 py-1 rounded-full'>
                {countdown}
              </span>
            </div>
          )}

          {/* Completed badge — top-left for past events */}
          {isPast && (
            <div className='absolute top-3 left-3'>
              <span className='bg-white/15 text-white/70 text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/15'>
                Completed
              </span>
            </div>
          )}

          {/* Price badge — top-right */}
          <div className='absolute top-3 right-3'>
            {pricePaise === 0 ? (
              <span className='bg-green-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full'>
                Free
              </span>
            ) : (
              <span className='bg-black/50 border border-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm'>
                ₹{(pricePaise / 100).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Bottom title overlay */}
          <div className='absolute bottom-0 left-0 right-0 p-4'>
            <h2 className='text-white font-bold text-lg leading-tight line-clamp-2 group-hover:text-stride-yellow-accent transition-colors duration-300'>
              {name}
            </h2>
            {subtitle && (
              <p className='text-white/55 text-sm mt-0.5 line-clamp-1'>{subtitle}</p>
            )}
            <div className='mt-2.5 flex flex-wrap gap-x-3 gap-y-1'>
              {dateStr && (
                <span className='flex items-center gap-1 text-white/45 text-xs'>
                  <Calendar size={10} />
                  {dateStr}
                </span>
              )}
              {location && (
                <span className='flex items-center gap-1 text-white/45 text-xs line-clamp-1'>
                  <MapPin size={10} />
                  {location}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
