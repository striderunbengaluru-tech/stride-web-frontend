'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Tag, Building2 } from 'lucide-react'
import { formatDateShortIST, formatTimeIST } from '@/lib/utils/ist'
import { deadlineLabel, type RaceCardData } from '@/lib/races/present'
import { distanceLabel, sortDistances } from '@/types/race'

type Props = {
  race: RaceCardData
  /** IST day the page was rendered on — drives past/deadline copy without a clock read. */
  todayKey: string
  nowIso: string
  dimmed?: boolean
}

/** Frame ratio until the poster's real dimensions are known. Most race posters are portrait. */
const DEFAULT_POSTER_RATIO = 3 / 4

// A client component only for the poster measurement below; it still renders
// on the server, which is what lets it be the calendar's Suspense fallback.
export function RaceCard({ race, todayKey, nowIso, dimmed = false }: Props) {
  // Organiser posters arrive in every ratio. Sizing the frame to the image
  // once it loads removes the letterbox bands without cropping the artwork.
  const [ratio, setRatio] = useState<number | null>(null)

  const dateLabel = formatDateShortIST(race.raceDate) + (race.hasStartTime ? ` · ${formatTimeIST(race.raceDate)}` : '')
  const where = [race.venue, race.city].filter(Boolean).join(', ')
  const deadline = deadlineLabel(race, todayKey, nowIso)

  return (
    <Link
      href={`/race-calendar/${race.slug}`}
      prefetch={false}
      className={`group flex flex-col h-full rounded-md border border-white/10 bg-white/4 overflow-hidden hover:border-white/25 hover:bg-white/6 transition-all duration-300 ${dimmed ? 'opacity-60' : ''}`}
    >
      <div style={{ aspectRatio: String(ratio ?? DEFAULT_POSTER_RATIO) }} className='relative shrink-0 bg-white/5 overflow-hidden'>
        {race.posterUrl ? (
          <Image
            src={race.posterUrl}
            alt={`${race.name} poster`}
            fill
            onLoad={(e) => {
              const img = e.currentTarget
              if (img.naturalWidth > 0 && img.naturalHeight > 0) setRatio(img.naturalWidth / img.naturalHeight)
            }}
            className='object-contain group-hover:scale-[1.02] transition-transform duration-500'
            sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
          />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center text-white/8 text-6xl select-none bg-linear-to-br from-stride-purple-primary to-stride-yellow-accent/8'>
            🏁
          </div>
        )}
        {race.couponCode && (
          <span className='absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-stride-yellow-accent px-2 py-1 text-[10px] font-black uppercase tracking-wider text-copy-black'>
            <Tag size={10} aria-hidden='true' /> Coupon
          </span>
        )}
      </div>

      <div className='flex flex-col flex-1 px-4 py-4'>
        <p className={`text-sm font-medium font-mono ${dimmed ? 'text-white/40' : 'text-stride-yellow-accent'}`}>
          {dateLabel}
        </p>
        <h3 className='text-white text-xl leading-snug line-clamp-2 mt-1.5 group-hover:text-stride-yellow-accent transition-colors duration-200'>
          {race.name}
        </h3>
        {race.organizer && (
          <p className='text-white/45 text-sm mt-1 flex items-center gap-1.5 min-w-0'>
            <Building2 size={12} className='shrink-0 text-white/30' aria-hidden='true' />
            <span className='truncate'>{race.organizer}</span>
          </p>
        )}

        {race.distances.length > 0 && (
          <ul className='flex flex-wrap gap-1.5 mt-3 list-none m-0 p-0' aria-label='Distances'>
            {sortDistances(race.distances).map(d => (
              <li key={d} className='rounded-full border border-white/15 bg-white/8 px-2.5 py-0.5 text-white/80 text-xs font-semibold'>
                {distanceLabel(d)}
              </li>
            ))}
          </ul>
        )}

        <div className='flex items-center justify-between mt-auto pt-3 gap-2'>
          <span className='flex items-center gap-1.5 text-white/50 text-sm min-w-0'>
            <MapPin size={12} className='shrink-0 text-white/30' aria-hidden='true' />
            <span className='truncate'>{where}</span>
          </span>
          {deadline && (
            <span className={`text-xs font-bold shrink-0 font-mono ${deadline.urgent ? 'text-stride-yellow-accent' : 'text-white/50'}`}>
              {deadline.text}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
