'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'
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
        setText(`${Math.floor(diff / 60_000)}m`)
      } else if (diff < 86_400_000) {
        setText(`${Math.floor(diff / 3_600_000)}h`)
      } else if (diff < 7 * 86_400_000) {
        const d = Math.floor(diff / 86_400_000)
        setText(d === 1 ? 'Tomorrow' : `${d} days`)
      } else {
        setText(null)
      }
    }

    calc()
    const id = setInterval(calc, 60_000)
    return () => clearInterval(id)
  }, [eventDate])

  return text
}

export function EventCard({ name, subtitle, slug, eventDate, location, pricePaise, coverUrl }: EventCardProps) {
  const countdown = useCountdown(eventDate)
  const isPast = eventDate ? eventDate < new Date() : false
  const priceLabel = pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`

  // Date formatted: "Sat, 28 Jun · 7:15 AM"
  const dateLabel = eventDate
    ? eventDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' +
      eventDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Link
        href={`/events/${slug}`}
        className='group block rounded-md border border-white/10 bg-white/4 overflow-hidden hover:border-white/25 hover:bg-white/6 transition-all duration-300'
      >
        {/* Image — clean, no overlays */}
        <div className='relative aspect-[4/5] bg-white/5'>
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={name}
              fill
              className='object-contain group-hover:scale-[1.02] transition-transform duration-500'
              sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
            />
          ) : (
            <div className='absolute inset-0 flex items-center justify-center text-white/8 text-6xl select-none bg-linear-to-br from-stride-purple-primary to-stride-yellow-accent/8'>
              🏃
            </div>
          )}

          {/* Past overlay */}
          {isPast && (
            <div className='absolute inset-0 bg-black/20' />
          )}
        </div>

        {/* Card body */}
        <div className='px-4 py-4'>
          {/* Date line + countdown */}
          {(dateLabel || countdown) && (
            <div className='flex items-center gap-2 mb-1.5'>
              {dateLabel && (
                <p className={`text-sm font-medium ${isPast ? 'text-white/30' : 'text-stride-yellow-accent'}`}>
                  {dateLabel}
                </p>
              )}
              {!isPast && countdown && (
                <span className='text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-stride-yellow-accent/15 text-stride-yellow-accent'>
                  In {countdown}
                </span>
              )}
            </div>
          )}

          {/* Name */}
          <h2 className='text-white font-bold text-xl leading-snug line-clamp-2 group-hover:text-stride-yellow-accent transition-colors duration-200'>
            {name}
          </h2>

          {/* Subtitle */}
          {subtitle && (
            <p className='text-white/40 text-sm mt-1 line-clamp-1'>{subtitle}</p>
          )}

          {/* Location + price row */}
          <div className='flex items-center justify-between mt-2.5 gap-2'>
            {location ? (
              <span className='flex items-center gap-1.5 text-white/45 text-sm min-w-0'>
                <MapPin size={12} className='shrink-0 text-white/30' />
                <span className='truncate'>{location}</span>
              </span>
            ) : <span />}
            <span className={`text-sm font-bold shrink-0 ${pricePaise === 0 ? 'text-green-400' : 'text-white/70'}`}>
              {priceLabel}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
