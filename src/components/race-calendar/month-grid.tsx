'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildMonthCells, monthKeyLabel, shiftMonth } from '@/lib/utils/month-grid'
import type { RaceCardData } from '@/lib/races/present'
import { RacePopover, type PopoverState } from './race-popover'

type Props = {
  monthKey: string
  racesByDay: Map<string, RaceCardData[]>
  todayKey: string
  nowIso: string
  /** Soft bounds for the prev/next buttons, so nobody pages into years of empty grid. */
  minMonth: string
  maxMonth: string
  onMonthChange: (monthKey: string) => void
}

const WEEKDAYS = [
  { short: 'Mon', long: 'Monday' }, { short: 'Tue', long: 'Tuesday' }, { short: 'Wed', long: 'Wednesday' },
  { short: 'Thu', long: 'Thursday' }, { short: 'Fri', long: 'Friday' }, { short: 'Sat', long: 'Saturday' },
  { short: 'Sun', long: 'Sunday' },
]

/** Chips shown per day on wide screens before collapsing into "+N more". */
const MAX_VISIBLE_CHIPS = 2
/** Dots shown per day on phones. */
const MAX_DOTS = 3
/** How long a preview survives after the pointer leaves both chip and card — long enough to cross the gap. */
const PREVIEW_CLOSE_DELAY_MS = 180

function dayNumber(dayKey: string): string {
  return String(Number(dayKey.slice(-2)))
}

/** "Sunday 12 October 2026" for the screen-reader label. */
function longDay(dayKey: string): string {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${dayKey}T00:00:00Z`))
}

/**
 * A real month calendar. Every date is an IST day key computed upstream, so the
 * grid never touches the visitor's timezone. Chips are buttons: hover or focus
 * peeks at the day, a click pins the card with the Register and coupon actions.
 * On phones the whole cell is one 44px button that opens a bottom sheet.
 */
export function MonthGrid({ monthKey, racesByDay, todayKey, nowIso, minMonth, maxMonth, onMonthChange }: Props) {
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }, [])
  const closePopover = useCallback(() => { cancelClose(); setPopover(null) }, [cancelClose])
  useEffect(() => cancelClose, [cancelClose])

  const rows = buildMonthCells(monthKey)
  const canGoBack = monthKey > minMonth
  const canGoForward = monthKey < maxMonth

  function preview(anchor: HTMLElement, races: RaceCardData[]) {
    cancelClose()
    // A pinned card stays put while the pointer wanders over other chips.
    setPopover(current => (current?.mode === 'pinned' ? current : { mode: 'preview', anchor, races }))
  }
  // Leaving the chip does not close the preview outright: the pointer needs a
  // beat to cross into the card, and entering the card cancels this timer.
  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      setPopover(current => (current?.mode === 'preview' ? null : current))
    }, PREVIEW_CLOSE_DELAY_MS)
  }, [cancelClose])
  function endPreviewNow() {
    cancelClose()
    setPopover(current => (current?.mode === 'preview' ? null : current))
  }
  function pin(anchor: HTMLElement, races: RaceCardData[]) {
    cancelClose()
    setPopover({ mode: 'pinned', anchor, races })
  }

  return (
    <div>
      <div className='flex items-center justify-between mb-4'>
        <button
          type='button'
          onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
          disabled={!canGoBack}
          aria-label='Previous month'
          className='inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:border-stride-yellow-accent/50 disabled:opacity-30 disabled:hover:border-white/15 transition-colors min-h-11 min-w-11'
        >
          <ChevronLeft size={18} aria-hidden='true' />
        </button>
        <h2 className='text-white text-2xl sm:text-3xl' aria-live='polite'>{monthKeyLabel(monthKey)}</h2>
        <button
          type='button'
          onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
          disabled={!canGoForward}
          aria-label='Next month'
          className='inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:border-stride-yellow-accent/50 disabled:opacity-30 disabled:hover:border-white/15 transition-colors min-h-11 min-w-11'
        >
          <ChevronRight size={18} aria-hidden='true' />
        </button>
      </div>

      <table role='grid' className='w-full table-fixed border-separate border-spacing-1'>
        <caption className='sr-only'>Races in {monthKeyLabel(monthKey)}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map(day => (
              <th key={day.short} scope='col' className='pb-2 text-center text-[11px] font-bold font-mono uppercase tracking-widest text-white/40'>
                <abbr title={day.long} className='no-underline'>{day.short}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((week, wi) => (
            <tr key={wi}>
              {week.map((dayKey, di) => {
                if (!dayKey) return <td key={`blank-${wi}-${di}`} aria-hidden='true' className='h-16 sm:h-28' />
                const races = racesByDay.get(dayKey) ?? []
                const isPast = dayKey < todayKey
                const isToday = dayKey === todayKey
                const overflow = races.length - MAX_VISIBLE_CHIPS
                const cellTone = isToday
                  ? 'border-stride-yellow-accent/60 bg-stride-yellow-accent/8'
                  : races.length > 0 ? 'border-white/15 bg-white/6' : 'border-white/8 bg-white/3'

                return (
                  <td key={dayKey} className={`align-top rounded-lg border p-0 overflow-hidden h-16 sm:h-28 ${cellTone} ${isPast ? 'opacity-60' : ''}`}>
                    {/* ≥ sm: day number + up to two chips */}
                    <div className='hidden sm:flex flex-col h-full p-1.5 gap-1'>
                      <time dateTime={dayKey} className={`text-xs font-mono font-bold ${isToday ? 'text-stride-yellow-accent' : 'text-white/60'}`}>
                        {dayNumber(dayKey)}<span className='sr-only'>, {longDay(dayKey)}{races.length > 0 ? `, ${races.length} ${races.length === 1 ? 'race' : 'races'}` : ''}</span>
                      </time>
                      {races.slice(0, MAX_VISIBLE_CHIPS).map(race => (
                        <button
                          key={race.id}
                          type='button'
                          onMouseEnter={e => preview(e.currentTarget, [race])}
                          onMouseLeave={scheduleClose}
                          onFocus={e => preview(e.currentTarget, [race])}
                          onBlur={endPreviewNow}
                          onClick={e => pin(e.currentTarget, [race])}
                          aria-haspopup='dialog'
                          className='w-full text-left rounded px-1.5 py-1 min-h-7 text-xs font-semibold leading-tight bg-stride-yellow-accent/15 text-stride-yellow-accent hover:bg-stride-yellow-accent hover:text-copy-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-stride-yellow-accent transition-colors'
                        >
                          <span className='line-clamp-2'>{race.name}</span>
                        </button>
                      ))}
                      {overflow > 0 && (
                        <button
                          type='button'
                          onClick={e => pin(e.currentTarget, races)}
                          aria-haspopup='dialog'
                          className='w-full text-left rounded px-1.5 min-h-7 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors'
                        >
                          +{overflow} more
                        </button>
                      )}
                    </div>

                    {/* < sm: the whole cell is the control */}
                    {races.length > 0 ? (
                      <button
                        type='button'
                        onClick={e => pin(e.currentTarget, races)}
                        aria-haspopup='dialog'
                        aria-label={`${longDay(dayKey)}, ${races.length} ${races.length === 1 ? 'race' : 'races'}`}
                        className='sm:hidden flex flex-col items-center justify-center gap-1.5 w-full h-full min-h-11 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-stride-yellow-accent transition-colors'
                      >
                        <span className={`text-sm font-mono font-bold ${isToday ? 'text-stride-yellow-accent' : 'text-white'}`}>{dayNumber(dayKey)}</span>
                        <span className='flex gap-0.5' aria-hidden='true'>
                          {races.slice(0, MAX_DOTS).map(race => (
                            <span key={race.id} className='size-1.5 rounded-full bg-stride-yellow-accent' />
                          ))}
                        </span>
                      </button>
                    ) : (
                      <div className='sm:hidden flex items-start justify-center w-full h-full pt-2'>
                        <time dateTime={dayKey} className={`text-sm font-mono ${isToday ? 'text-stride-yellow-accent font-bold' : 'text-white/45'}`}>
                          {dayNumber(dayKey)}
                        </time>
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <RacePopover
        state={popover}
        todayKey={todayKey}
        nowIso={nowIso}
        onClose={closePopover}
        onPointerEnter={cancelClose}
        onPointerLeave={scheduleClose}
      />
    </div>
  )
}
