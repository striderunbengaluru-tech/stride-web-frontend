'use client'

import { X } from 'lucide-react'
import { RACE_DISTANCES, RACE_DISTANCE_KEYS, OTHER_DISTANCE_KEY } from '@/types/race'
import type { RaceWindow } from './use-race-calendar-params'

const WINDOWS: { key: RaceWindow; label: string }[] = [
  { key: 'all', label: 'All upcoming' },
  { key: 'month', label: 'This month' },
  { key: '3m', label: 'Next 3 months' },
]

type Props = {
  selectedDistances: string[]
  onToggleDistance: (key: string) => void
  /** Whether any race carries a custom distance — the "Other" chip is pointless otherwise. */
  hasOther: boolean
  city: string | null
  cities: string[]
  onCityChange: (city: string | null) => void
  when: RaceWindow
  onWhenChange: (when: RaceWindow) => void
  /** The date window only applies to the list; the month grid has its own navigation. */
  showWindow: boolean
  onClear: () => void
}

const chipClass = (active: boolean) =>
  `shrink-0 rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors min-h-11 ${
    active
      ? 'bg-stride-yellow-accent border-stride-yellow-accent text-copy-black'
      : 'bg-white/5 border-white/15 text-white/70 hover:border-stride-yellow-accent/50 hover:text-white'
  }`

export function RaceFilters({
  selectedDistances, onToggleDistance, hasOther, city, cities, onCityChange, when, onWhenChange, showWindow, onClear,
}: Props) {
  const hasActive = selectedDistances.length > 0 || city !== null || when !== 'all'
  const distanceKeys: string[] = hasOther ? [...RACE_DISTANCE_KEYS, OTHER_DISTANCE_KEY] : [...RACE_DISTANCE_KEYS]

  return (
    <div className='space-y-4'>
      {/* Distance chips. The row scrolls inside its own gutter on phones so a
          long chip set never makes the page itself scroll sideways. */}
      <div role='group' aria-label='Filter by distance' className='flex gap-2 overflow-x-auto scrollbar-hide -mx-6 px-6 sm:mx-0 sm:px-0 sm:flex-wrap'>
        {distanceKeys.map(key => {
          const active = selectedDistances.includes(key)
          const label = key === OTHER_DISTANCE_KEY ? 'Other' : RACE_DISTANCES[key as keyof typeof RACE_DISTANCES].label
          return (
            <button key={key} type='button' onClick={() => onToggleDistance(key)} aria-pressed={active} className={chipClass(active)}>
              {label}
            </button>
          )
        })}
      </div>

      <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
        {cities.length > 1 && (
          <label className='flex items-center gap-2 text-sm text-white/70'>
            <span className='shrink-0'>City</span>
            <select
              value={city ?? ''}
              onChange={e => onCityChange(e.target.value || null)}
              className='bg-white/8 border border-white/20 rounded-md px-3 py-2 text-white text-sm min-h-11 min-w-40 focus:outline-none focus:border-stride-yellow-accent/70 scheme-dark'
            >
              <option value=''>All cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        )}

        {showWindow && (
          <div role='group' aria-label='Date window' className='flex gap-1 bg-white/5 border border-white/8 rounded-xl p-1 w-fit max-w-full overflow-x-auto scrollbar-hide'>
            {WINDOWS.map(({ key, label }) => (
              <button
                key={key}
                type='button'
                onClick={() => onWhenChange(key)}
                aria-pressed={when === key}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap min-h-9 ${
                  when === key ? 'bg-stride-yellow-accent text-copy-black shadow-sm' : 'text-white/50 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {hasActive && (
          <button
            type='button'
            onClick={onClear}
            className='inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors min-h-11 sm:ml-auto'
          >
            <X size={14} aria-hidden='true' /> Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
