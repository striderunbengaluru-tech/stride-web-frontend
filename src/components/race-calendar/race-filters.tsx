'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { SlidersHorizontal, X, Check } from 'lucide-react'
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
  /** Whether any race carries a custom distance — the "Other" option is pointless otherwise. */
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

function distanceName(key: string): string {
  return key === OTHER_DISTANCE_KEY ? 'Other' : RACE_DISTANCES[key as keyof typeof RACE_DISTANCES].label
}

const optionClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors min-h-11 ${
    active
      ? 'bg-stride-yellow-accent border-stride-yellow-accent text-copy-black'
      : 'bg-white/5 border-white/15 text-white/75 hover:border-stride-yellow-accent/50 hover:text-white'
  }`

/**
 * One "Filters" control that opens a panel — a dropdown under the button on
 * wide screens, a bottom sheet on phones — with distance, city and date
 * window inside. What is active shows as removable chips beside the button,
 * so the page never needs to display every option at once.
 */
export function RaceFilters({
  selectedDistances, onToggleDistance, hasOther, city, cities, onCityChange, when, onWhenChange, showWindow, onClear,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const distanceKeys: string[] = hasOther ? [...RACE_DISTANCE_KEYS, OTHER_DISTANCE_KEY] : [...RACE_DISTANCE_KEYS]
  const windowActive = showWindow && when !== 'all'
  const activeCount = selectedDistances.length + (city ? 1 : 0) + (windowActive ? 1 : 0)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const panel = (
    <div className='space-y-6'>
      <fieldset>
        <legend className='text-white text-sm font-semibold mb-3'>Distance</legend>
        <div className='flex flex-wrap gap-2'>
          {distanceKeys.map(key => {
            const active = selectedDistances.includes(key)
            return (
              <button key={key} type='button' onClick={() => onToggleDistance(key)} aria-pressed={active} className={optionClass(active)}>
                {active && <Check size={14} aria-hidden='true' />}
                {distanceName(key)}
              </button>
            )
          })}
        </div>
      </fieldset>

      {cities.length > 1 && (
        <fieldset>
          <legend className='text-white text-sm font-semibold mb-3'>City</legend>
          <div className='flex flex-wrap gap-2'>
            <button type='button' onClick={() => onCityChange(null)} aria-pressed={city === null} className={optionClass(city === null)}>
              Anywhere
            </button>
            {cities.map(c => (
              <button key={c} type='button' onClick={() => onCityChange(c)} aria-pressed={city === c} className={optionClass(city === c)}>
                {city === c && <Check size={14} aria-hidden='true' />}
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {showWindow && (
        <fieldset>
          <legend className='text-white text-sm font-semibold mb-3'>When</legend>
          <div className='flex flex-wrap gap-2'>
            {WINDOWS.map(({ key, label }) => (
              <button key={key} type='button' onClick={() => onWhenChange(key)} aria-pressed={when === key} className={optionClass(when === key)}>
                {when === key && <Check size={14} aria-hidden='true' />}
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className='flex items-center justify-between gap-3 pt-2 border-t border-white/10'>
        <button
          type='button'
          onClick={onClear}
          disabled={activeCount === 0}
          className='text-sm text-white/60 hover:text-white disabled:opacity-40 disabled:hover:text-white/60 transition-colors min-h-11'
        >
          Clear all
        </button>
        <button
          type='button'
          onClick={() => setOpen(false)}
          className='rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm px-5 py-2.5 min-h-11 hover:bg-stride-yellow-accent/90 transition-colors'
        >
          Done
        </button>
      </div>
    </div>
  )

  return (
    <div ref={rootRef} className='relative flex flex-wrap items-center gap-2'>
      <button
        type='button'
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold min-h-11 transition-colors ${
          activeCount > 0
            ? 'border-stride-yellow-accent/60 bg-stride-yellow-accent/10 text-white'
            : 'border-white/15 bg-white/5 text-white/80 hover:border-stride-yellow-accent/50 hover:text-white'
        }`}
      >
        <SlidersHorizontal size={15} aria-hidden='true' />
        Filters
        {activeCount > 0 && (
          <span className='inline-flex items-center justify-center rounded-full bg-stride-yellow-accent text-copy-black text-[11px] font-black min-w-5 h-5 px-1.5 tabular-nums'>
            {activeCount}
          </span>
        )}
      </button>

      {/* Active filters, removable in place */}
      {selectedDistances.map(key => (
        <button key={key} type='button' onClick={() => onToggleDistance(key)} aria-label={`Remove ${distanceName(key)} filter`} className='inline-flex items-center gap-1.5 rounded-md bg-white/8 border border-white/15 px-3 py-2 text-sm text-white/85 hover:border-white/40 min-h-11'>
          {distanceName(key)} <X size={13} aria-hidden='true' />
        </button>
      ))}
      {city && (
        <button type='button' onClick={() => onCityChange(null)} aria-label={`Remove ${city} filter`} className='inline-flex items-center gap-1.5 rounded-md bg-white/8 border border-white/15 px-3 py-2 text-sm text-white/85 hover:border-white/40 min-h-11'>
          {city} <X size={13} aria-hidden='true' />
        </button>
      )}
      {windowActive && (
        <button type='button' onClick={() => onWhenChange('all')} aria-label='Remove date filter' className='inline-flex items-center gap-1.5 rounded-md bg-white/8 border border-white/15 px-3 py-2 text-sm text-white/85 hover:border-white/40 min-h-11'>
          {WINDOWS.find(w => w.key === when)?.label} <X size={13} aria-hidden='true' />
        </button>
      )}

      {open && (
        <>
          {/* Phones: sheet from the bottom over a dim backdrop */}
          <div className='sm:hidden fixed inset-0 z-50 flex flex-col justify-end'>
            <button type='button' onClick={() => setOpen(false)} aria-label='Close filters' className='absolute inset-0 bg-black/60' />
            <div id={panelId} role='dialog' aria-label='Filters' className='relative rounded-t-2xl bg-stride-purple-primary/95 backdrop-blur-xl border-t border-white/15 px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[80dvh] overflow-y-auto shadow-2xl'>
              {panel}
            </div>
          </div>
          {/* Wide screens: dropdown under the button */}
          <div
            id={panelId}
            role='dialog'
            aria-label='Filters'
            className='hidden sm:block absolute right-0 top-full mt-2 z-40 w-[26rem] max-w-[calc(100vw-2rem)] rounded-xl bg-stride-purple-primary/95 backdrop-blur-xl border border-white/15 shadow-2xl p-5'
          >
            {panel}
          </div>
        </>
      )}
    </div>
  )
}
