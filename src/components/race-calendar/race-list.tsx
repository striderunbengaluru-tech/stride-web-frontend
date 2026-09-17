import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { monthKeyLabel } from '@/lib/utils/month-grid'
import type { RaceCardData } from '@/lib/races/present'
import { RaceCard } from './race-card'

const DUCKY_URL =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/ducky-2.png'

type Props = {
  /** Soonest first. */
  upcoming: RaceCardData[]
  /** Most recent first. */
  past: RaceCardData[]
  todayKey: string
  nowIso: string
  filtersActive?: boolean
}

function groupByMonth(races: RaceCardData[]): { monthKey: string; races: RaceCardData[] }[] {
  const groups: { monthKey: string; races: RaceCardData[] }[] = []
  for (const race of races) {
    const last = groups[groups.length - 1]
    if (last && last.monthKey === race.monthKey) last.races.push(race)
    else groups.push({ monthKey: race.monthKey, races: [race] })
  }
  return groups
}

// Hook-free so the server can render it as the Suspense fallback.
export function RaceList({ upcoming, past, todayKey, nowIso, filtersActive = false }: Props) {
  return (
    <div>
      {upcoming.length === 0 ? (
        <div className='py-20 flex flex-col items-center text-center'>
          <div className='relative mb-5'>
            <div className='absolute inset-0 rounded-full bg-stride-yellow-accent/15 blur-2xl scale-90' aria-hidden='true' />
            <Image
              src={DUCKY_URL}
              alt='Ducky the Stride mascot, waiting for the next race'
              width={200}
              height={200}
              className='relative w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]'
            />
          </div>
          <p className='text-white text-lg font-semibold'>
            {filtersActive ? 'No races match those filters.' : 'No upcoming races listed right now.'}
          </p>
          <p className='text-white/70 text-sm mt-2 max-w-xs'>
            {filtersActive ? 'Try clearing a filter or widening the date window.' : 'New races are added as organisers announce them.'}
          </p>
        </div>
      ) : (
        <div className='space-y-12'>
          {groupByMonth(upcoming).map(group => (
            <section key={group.monthKey} aria-labelledby={`month-${group.monthKey}`}>
              <div className='flex items-baseline gap-3 mb-6'>
                <h2 id={`month-${group.monthKey}`} className='text-white text-2xl sm:text-3xl'>
                  {monthKeyLabel(group.monthKey)}
                </h2>
                <span className='text-white/35 text-sm font-mono tabular-nums'>{group.races.length}</span>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10'>
                {group.races.map(race => (
                  <RaceCard key={race.id} race={race} todayKey={todayKey} nowIso={nowIso} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <details className='group mt-16 border-t border-white/10 pt-6'>
          <summary className='flex items-center gap-2 cursor-pointer list-none text-white/60 hover:text-white text-sm font-semibold min-h-11 select-none'>
            <ChevronDown size={16} className='transition-transform group-open:rotate-180' aria-hidden='true' />
            Past races <span className='text-white/30 font-normal'>({past.length})</span>
          </summary>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10 mt-6'>
            {past.map(race => (
              <RaceCard key={race.id} race={race} todayKey={todayKey} nowIso={nowIso} dimmed />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
