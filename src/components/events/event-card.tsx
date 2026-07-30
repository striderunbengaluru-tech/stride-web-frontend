'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDateShortIST, formatTimeIST, istCalendarDaysUntil } from '@/lib/utils/ist'

type EventCardProps = {
  name: string
  subtitle: string | null
  slug: string
  eventDate: Date | null
  location: string | null
  /**
   * Resolved server-side (see eventRowPriceLabel) so a package event reads
   * "From ₹X" here exactly as it does on the detail page. Previously the card
   * derived this from price_paise alone, which is 0 when packages set the
   * price — so every package event advertised itself as Free.
   */
  priceLabel: string
  isFree: boolean
  coverUrl: string | null
}

/**
 * Frame ratio used until the poster's real dimensions are known. Matches the
 * 3:4 the admin cropper produces, so the common case never shifts.
 */
const DEFAULT_POSTER_RATIO = 3 / 4

/** Days ahead beyond which the badge says nothing at all. */
const COUNTDOWN_HORIZON_DAYS = 7

/**
 * The badge's complete label, not a fragment. Two things live here on purpose:
 *
 * - The "In " prefix, because it doesn't fit every value — "Tomorrow" already
 *   names a time, and prefixing it produced "In Tomorrow".
 * - The day arithmetic, which counts IST *calendar* days rather than 24-hour
 *   blocks. Everything this app shows is IST (see @/lib/utils/ist), and a run at
 *   6:30 am is "tomorrow" only when it falls on the next IST date — not merely
 *   when it's 24-48 hours out.
 */
function useCountdown(eventDate: Date | null): string | null {
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    if (!eventDate) return

    function calc() {
      const diff = eventDate!.getTime() - Date.now()
      if (diff <= 0) { setText(null); return }

      const days = istCalendarDaysUntil(eventDate!)

      // Later the same IST day — hours and minutes are more useful than "today".
      if (days <= 0) {
        setText(diff < 3_600_000
          ? `In ${Math.floor(diff / 60_000)}m`
          : `In ${Math.floor(diff / 3_600_000)}h`)
      } else if (days === 1) {
        setText('Tomorrow')
      } else if (days < COUNTDOWN_HORIZON_DAYS) {
        setText(`In ${days} days`)
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

export function EventCard({ name, subtitle, slug, eventDate, location, priceLabel, isFree, coverUrl }: EventCardProps) {
  const countdown = useCountdown(eventDate)
  const isPast = eventDate ? eventDate < new Date() : false

  // The poster's true aspect ratio, measured once it loads. A fixed 3:4 frame
  // letterboxed any poster that wasn't exactly 3:4 — dead purple bands above and
  // below the artwork. Sizing the frame to the image removes them without
  // cropping the poster (these have text on them), and shrinks the card to suit.
  const [ratio, setRatio] = useState<number | null>(null)

  // "Sat, 28 Jun · 07:15 am" — pinned to IST, so the card reads the same for a
  // visitor abroad as it does for the runner showing up at the start line.
  const dateLabel = eventDate
    ? formatDateShortIST(eventDate.toISOString()) +
      ' · ' +
      formatTimeIST(eventDate.toISOString())
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
        {/* Image — the frame takes the poster's own ratio once measured, so
            object-contain has nothing left to letterbox and the card shrinks to
            the artwork instead of padding it out with dead space. */}
        <div
          style={{ aspectRatio: String(ratio ?? DEFAULT_POSTER_RATIO) }}
          className='relative bg-white/5 overflow-hidden'
        >
          {coverUrl ? (
            <>
              {/* Blurred backdrop only until the real ratio is known — after
                  that the poster fills the frame exactly and there is nothing
                  behind it to show. */}
              {ratio === null && (
                <Image
                  src={coverUrl}
                  alt=''
                  aria-hidden
                  fill
                  className='object-cover blur-2xl scale-110 opacity-40'
                  sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                />
              )}
              <Image
                src={coverUrl}
                alt={name}
                fill
                onLoad={(e) => {
                  const img = e.currentTarget
                  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    setRatio(img.naturalWidth / img.naturalHeight)
                  }
                }}
                className='object-contain group-hover:scale-[1.02] transition-transform duration-500'
                sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
              />
            </>
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
                <p className={`text-sm font-medium font-mono ${isPast ? 'text-white/30' : 'text-stride-yellow-accent'}`}>
                  {dateLabel}
                </p>
              )}
              {!isPast && countdown && (
                <span className='text-[10px] font-black px-2 py-0.5 rounded-full font-mono uppercase tracking-wider bg-stride-yellow-accent/15 text-stride-yellow-accent'>
                  {countdown}
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
            <span className={`text-sm font-bold shrink-0 font-mono ${isFree ? 'text-green-400' : 'text-white/70'}`}>
              {priceLabel}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
