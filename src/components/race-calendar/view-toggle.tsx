'use client'

import { List, CalendarDays } from 'lucide-react'
import type { RaceView } from './use-race-calendar-params'

const VIEWS: { key: RaceView; label: string; icon: typeof List }[] = [
  { key: 'list', label: 'List', icon: List },
  { key: 'month', label: 'Calendar', icon: CalendarDays },
]

export function ViewToggle({ view, onChange }: { view: RaceView; onChange: (view: RaceView) => void }) {
  return (
    <div className='flex gap-1.5 bg-white/5 border border-white/8 rounded-2xl p-1.5 w-fit' role='group' aria-label='View'>
      {VIEWS.map(({ key, label, icon: Icon }) => {
        const active = view === key
        return (
          <button
            key={key}
            type='button'
            onClick={() => onChange(key)}
            aria-pressed={active}
            toolname={`show_races_as_${key}`}
            tooldescription={`Show the race calendar as a ${label.toLowerCase()}`}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 min-h-11 ${
              active ? 'bg-stride-yellow-accent text-copy-black shadow-lg' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Icon size={15} aria-hidden='true' />
            {label}
          </button>
        )
      })}
    </div>
  )
}
