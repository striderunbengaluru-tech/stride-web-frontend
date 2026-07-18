'use client'

import { useState, useEffect } from 'react'

interface Segment { value: number; label: string }

function compute(target: string): Segment[] | null {
  const total = new Date(target).getTime() - Date.now()
  if (total <= 0) return null

  const d = Math.floor(total / 86_400_000)
  const h = Math.floor((total % 86_400_000) / 3_600_000)
  const m = Math.floor((total % 3_600_000) / 60_000)
  const s = Math.floor((total % 60_000) / 1000)

  // Always include seconds so the timer feels live
  if (d > 0) return [
    { value: d, label: 'days' },
    { value: h, label: 'hrs' },
    { value: m, label: 'min' },
    { value: s, label: 'sec' },
  ]
  if (h > 0) return [
    { value: h, label: 'hrs' },
    { value: m, label: 'min' },
    { value: s, label: 'sec' },
  ]
  return [{ value: m, label: 'min' }, { value: s, label: 'sec' }]
}

export function EventCountdown({ eventDate, label }: { eventDate: string; label?: string }) {
  // Client-only: starts null and computes after mount. Rendering a tick value
  // during SSR would be stale on ISR pages and mismatch on hydration.
  const [segments, setSegments] = useState<Segment[] | null>(null)

  useEffect(() => {
    setSegments(compute(eventDate))
    const id = setInterval(() => setSegments(compute(eventDate)), 1000)
    return () => clearInterval(id)
  }, [eventDate])

  if (!segments) return null

  const urgent = segments.length === 2 // only min + sec — under 1 hour

  return (
    <div>
      {label && (
        <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest mb-2'>{label}</p>
      )}
    <div className='flex items-end gap-2'>
      {segments.map(({ value, label }, i) => (
        <div key={label} className='flex flex-col items-center'>
          <div className={`relative flex items-center justify-center rounded-xl border min-w-[52px] py-2.5 px-2 ${
            urgent
              ? 'bg-stride-yellow-accent/10 border-stride-yellow-accent/30'
              : 'bg-white/6 border-white/10'
          }`}>
            <span className={`text-2xl font-bold tabular-nums leading-none tracking-tight ${
              urgent ? 'text-stride-yellow-accent' : 'text-white'
            }`}>
              {String(value).padStart(2, '0')}
            </span>
            {i < segments.length - 1 && (
              <span className='absolute -right-[9px] top-1/2 -translate-y-[55%] text-white/25 font-bold text-base select-none'>:</span>
            )}
          </div>
          <p className='text-white/30 text-[9px] font-mono uppercase tracking-widest mt-1.5'>{label}</p>
        </div>
      ))}
    </div>
    </div>
  )
}
