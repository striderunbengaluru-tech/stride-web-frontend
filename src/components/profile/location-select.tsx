'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { INDIA_CITIES, OTHER_LOCATION_MAX } from '@/lib/india-cities'

const OTHER = 'Other'

type Props = {
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
}

// Type-to-search city combobox. Picks from a curated India list, or "Other"
// to type a free-form city (capped at OTHER_LOCATION_MAX chars).
export function LocationSelect({ icon, value, onChange }: Props) {
  // "Other mode" = the current value isn't one of the known cities (and isn't empty).
  const isKnown = (v: string) => (INDIA_CITIES as readonly string[]).includes(v)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [otherMode, setOtherMode] = useState(!!value && !isKnown(value))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const filtered = query.trim()
    ? INDIA_CITIES.filter(c => c.toLowerCase().includes(query.trim().toLowerCase()))
    : INDIA_CITIES

  function pick(city: string) {
    if (city === OTHER) {
      setOtherMode(true)
      onChange('')
    } else {
      setOtherMode(false)
      onChange(city)
    }
    setOpen(false)
    setQuery('')
  }

  // Free-form "Other" input.
  if (otherMode) {
    return (
      <div className='flex items-center gap-2.5 bg-white/5 border border-white/15 rounded-lg px-3 focus-within:border-stride-yellow-accent/50 transition-colors'>
        <span className='shrink-0 flex items-center justify-center w-4'>{icon}</span>
        <input
          className='flex-1 min-w-0 bg-transparent py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none'
          value={value}
          maxLength={OTHER_LOCATION_MAX}
          onChange={e => onChange(e.target.value)}
          placeholder='Your city'
          autoFocus
        />
        <button
          type='button'
          onClick={() => { setOtherMode(false); onChange('') }}
          className='shrink-0 text-white/30 hover:text-white text-[11px] transition-colors'
        >
          List
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className='relative'>
      <button
        type='button'
        onClick={() => setOpen(o => !o)}
        className='w-full flex items-center gap-2.5 bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 focus:outline-none focus-within:border-stride-yellow-accent/50 transition-colors'
        aria-haspopup='listbox'
        aria-expanded={open}
      >
        <span className='shrink-0 flex items-center justify-center w-4'>{icon}</span>
        <span className={`flex-1 min-w-0 text-left text-sm truncate ${value ? 'text-white' : 'text-white/30'}`}>
          {value || 'Select your city'}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className='absolute z-30 mt-1.5 w-full rounded-xl bg-stride-purple-primary/95 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/40 overflow-hidden'>
          <div className='p-2 border-b border-white/10'>
            <input
              className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-stride-yellow-accent/40'
              placeholder='Search city…'
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <ul role='listbox' className='max-h-56 overflow-y-auto py-1'>
            {filtered.map(city => (
              <li key={city}>
                <button
                  type='button'
                  onClick={() => pick(city)}
                  className='w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left text-sm text-white/80 hover:bg-white/8 hover:text-white transition-colors'
                  role='option'
                  aria-selected={value === city}
                >
                  {city}
                  {value === city && <Check size={14} className='text-stride-yellow-accent shrink-0' />}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className='px-3.5 py-2 text-white/30 text-xs'>No matching city</li>
            )}
            <li className='border-t border-white/10 mt-1'>
              <button
                type='button'
                onClick={() => pick(OTHER)}
                className='w-full px-3.5 py-2 text-left text-sm text-stride-yellow-accent hover:bg-stride-yellow-accent/10 transition-colors'
                role='option'
                aria-selected={false}
              >
                Other — type my city
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
