'use client'

import { useEffect, useState } from 'react'
import NumberFlow from '@number-flow/react'
import { cn } from '@/lib/utils'

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number }

const ZERO: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 }

const SEGMENTS = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Mins' },
  { key: 'seconds', label: 'Secs' },
] as const

const SIZES = {
  sm: {
    digit: 'text-xl sm:text-2xl',
    label: 'text-[9px] mt-1',
    separator: 'text-base',
    gap: 'gap-2 sm:gap-2.5',
  },
  lg: {
    digit: 'text-4xl sm:text-5xl',
    label: 'text-[10px] mt-1.5',
    separator: 'text-2xl',
    gap: 'gap-2.5 sm:gap-4',
  },
} as const

type Props = {
  /** The moment being counted down to. */
  endDate: Date
  /** Count from this instant instead of "now" — mainly useful for tests/stories. */
  startDate?: Date
  className?: string
  size?: keyof typeof SIZES
  /** Small caption above the digits, e.g. "Starts in". */
  label?: string
}

function timeUntil(end: Date, start?: Date): TimeLeft {
  const diff = end.getTime() - (start ? start.getTime() : Date.now())
  if (diff <= 0) return ZERO

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
  }
}

const isElapsed = (t: TimeLeft) => !t.days && !t.hours && !t.minutes && !t.seconds

/**
 * Live countdown with digits that roll between values.
 *
 * Renders nothing until mounted: the value depends on "now", so emitting it
 * during SSR bakes a stale time into statically generated / ISR HTML and
 * mismatches on hydration. Callers that care about layout shift should reserve
 * the slot (see `UpNextBanner`).
 */
export function AnimatedNumberCountdown({
  endDate,
  startDate,
  className,
  size = 'lg',
  label,
}: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)

  useEffect(() => {
    const end = new Date(endDate)
    const start = startDate ? new Date(startDate) : undefined

    const tick = () => {
      const next = timeUntil(end, start)
      setTimeLeft(next)
      return next
    }

    // Already in the past — show nothing and never start a timer.
    if (isElapsed(tick())) return

    const id = setInterval(() => {
      if (isElapsed(tick())) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [endDate, startDate])

  if (!timeLeft || isElapsed(timeLeft)) return null

  const s = SIZES[size]

  return (
    <div className={className}>
      {label && (
        <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest mb-2'>
          {label}
        </p>
      )}

      {/* The rolling digits are decorative for assistive tech — a value that
          changes every second would be announced endlessly. One static summary
          below carries the same information. */}
      <div className={cn('flex items-start', s.gap)} aria-hidden='true'>
        {SEGMENTS.map(({ key, label: segLabel }, i) => (
          <div key={key} className='flex items-center'>
            <div className='flex flex-col items-center'>
              <NumberFlow
                value={timeLeft[key]}
                format={{ minimumIntegerDigits: 2 }}
                className={cn(
                  'font-bold tabular-nums leading-none tracking-tight text-white',
                  s.digit
                )}
              />
              <span
                className={cn(
                  'font-mono uppercase tracking-widest text-white/35 leading-none',
                  s.label
                )}
              >
                {segLabel}
              </span>
            </div>
            {i < SEGMENTS.length - 1 && (
              <span className={cn('font-bold text-white/25 select-none px-1', s.separator)}>
                :
              </span>
            )}
          </div>
        ))}
      </div>

      <span className='sr-only'>
        {timeLeft.days} days, {timeLeft.hours} hours and {timeLeft.minutes} minutes remaining
      </span>
    </div>
  )
}

export default AnimatedNumberCountdown
