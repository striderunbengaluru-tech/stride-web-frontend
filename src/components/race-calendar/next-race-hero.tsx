import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, MapPin, Building2 } from 'lucide-react'
import { formatDateLongIST, formatTimeIST, formatMonthIST, formatDayIST } from '@/lib/utils/ist'
import { dayKeyDiff } from '@/lib/utils/month-grid'
import { isRegistrationOpen, deadlineLabel, type RaceCardData } from '@/lib/races/present'
import { distanceLabel, sortDistances } from '@/types/race'
import { RaceDetailCtas } from './race-detail-ctas'

type Props = {
  race: RaceCardData
  todayKey: string
  nowIso: string
}

/** "Race day" / "Tomorrow" / "In 25 days". */
function countdown(dayKey: string, todayKey: string): string {
  const days = dayKeyDiff(dayKey, todayKey)
  if (days <= 0) return 'Race day'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

/**
 * The soonest upcoming race, given the whole width of the page. This is the
 * one thing a visitor came to learn — what is next and how to get in — so it
 * gets the poster, the serif, the date large, and both actions without a click.
 * Hook-free: rendered on the server, above the filterable list.
 */
export function NextRaceHero({ race, todayKey, nowIso }: Props) {
  const open = isRegistrationOpen(race, todayKey, nowIso)
  const deadline = deadlineLabel(race, todayKey, nowIso)
  const where = [race.venue, race.city].filter(Boolean).join(', ')

  return (
    <section aria-labelledby='next-race-heading' className='relative overflow-hidden rounded-2xl border border-white/15 bg-white/6 backdrop-blur-md'>
      <div className='grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]'>
        {/* Poster — a fixed 3:4 column on mobile; from md the column stretches to
            the row height and the poster sits uncropped (object-contain) over a
            blurred copy of itself, so a taller text column never leaves a gap. */}
        <Link href={`/race-calendar/${race.slug}`} prefetch={false} className='relative block aspect-3/4 md:aspect-auto md:h-full md:min-h-[400px] lg:min-h-[453px] bg-white/5 overflow-hidden group'>
          {race.posterUrl ? (
            <>
              <Image
                src={race.posterUrl}
                alt=''
                aria-hidden='true'
                fill
                sizes='64px'
                className='hidden md:block object-cover scale-125 blur-2xl opacity-70'
              />
              <Image
                src={race.posterUrl}
                alt={`${race.name} poster`}
                fill
                priority
                className='object-cover md:object-contain group-hover:scale-[1.02] transition-transform duration-500'
                sizes='(max-width: 768px) 100vw, 340px'
              />
            </>
          ) : (
            <div className='absolute inset-0 flex items-center justify-center text-white/10 text-7xl select-none'>🏁</div>
          )}
          {/* Date badge over the poster corner */}
          <div className='absolute top-3 left-3 rounded-lg bg-stride-purple-primary/90 backdrop-blur-md border border-white/15 px-3 py-2 text-center leading-none'>
            <p className='text-stride-yellow-accent text-[10px] font-black font-mono tracking-widest'>{formatMonthIST(race.raceDate)}</p>
            <p className='text-white font-bold text-2xl font-mono mt-0.5'>{formatDayIST(race.raceDate)}</p>
          </div>
        </Link>

        {/* Copy + actions */}
        <div className='flex flex-col justify-center p-5 sm:p-7 lg:p-9 min-w-0'>
          <p className='text-stride-yellow-accent text-sm font-semibold font-mono'>
            Next up · {countdown(race.dayKey, todayKey)}
          </p>
          <h2 id='next-race-heading' className='text-white text-3xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tight mt-3 text-balance'>
            <Link href={`/race-calendar/${race.slug}`} prefetch={false} className='hover:text-stride-yellow-accent transition-colors'>
              {race.name}
            </Link>
          </h2>

          <dl className='mt-4 space-y-1.5 text-white/70 text-sm sm:text-base'>
            <div className='flex gap-2'>
              <dt className='sr-only'>When</dt>
              <dd className='font-mono'>
                {formatDateLongIST(race.raceDate)}{race.hasStartTime ? `, ${formatTimeIST(race.raceDate)}` : ''}
              </dd>
            </div>
            <div className='flex items-center gap-2 min-w-0'>
              <dt className='sr-only'>Where</dt>
              <MapPin size={14} className='shrink-0 text-white/40' aria-hidden='true' />
              <dd className='truncate'>{where}</dd>
            </div>
            {race.organizer && (
              <div className='flex items-center gap-2 min-w-0'>
                <dt className='sr-only'>Organiser</dt>
                <Building2 size={14} className='shrink-0 text-white/40' aria-hidden='true' />
                <dd className='truncate'>{race.organizer}</dd>
              </div>
            )}
          </dl>

          {race.distances.length > 0 && (
            <ul className='flex flex-wrap gap-1.5 mt-4 list-none m-0 p-0' aria-label='Distances'>
              {sortDistances(race.distances).map(d => (
                <li key={d} className='rounded-full border border-white/15 bg-white/8 px-3 py-1 text-white/85 text-xs font-semibold'>
                  {distanceLabel(d)}
                </li>
              ))}
            </ul>
          )}

          <div className='mt-auto pt-6'>
            <div className='sm:max-w-md'>
              <RaceDetailCtas registrationUrl={race.registrationUrl} couponCode={race.couponCode} discountPercent={race.discountPercent} open={open} />
            </div>
            <div className='flex flex-wrap items-center justify-between gap-3 mt-3'>
              {deadline ? (
                <p className={`text-xs font-mono ${deadline.urgent ? 'text-stride-yellow-accent' : 'text-white/45'}`}>{deadline.text}</p>
              ) : <span />}
              <Link href={`/race-calendar/${race.slug}`} prefetch={false} className='inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-stride-yellow-accent transition-colors min-h-11'>
                Race details <ArrowRight size={14} aria-hidden='true' />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
