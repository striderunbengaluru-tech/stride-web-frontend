'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, ChevronDown, RotateCcw, Users, Clock, Calendar } from 'lucide-react'

type Event = {
  id: string
  name: string
  event_date: string | null
  end_date: string | null
}
type EventStats = { checkedIn: number; total: number }

type CheckInState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; attendeeName: string; eventName: string; runsCompleted: number; checkedInAt: string }
  | { status: 'error'; message: string }

// Check-in is allowed from event_date - 6h up to end_date + 24h (or event_date + 24h if no end_date).
// Lower bound lets admins pre-open the check-in screen ~6h before the run.
const CHECKIN_PRE_WINDOW_MS = 6 * 60 * 60 * 1000
const CHECKIN_POST_WINDOW_MS = 24 * 60 * 60 * 1000

function eventWindow(e: Event) {
  if (!e.event_date) return null
  const start = new Date(e.event_date).getTime()
  const end   = new Date(e.end_date ?? e.event_date).getTime()
  return {
    opensAt:  start - CHECKIN_PRE_WINDOW_MS,
    closesAt: end + CHECKIN_POST_WINDOW_MS,
  }
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return '0m'
  const totalMin = Math.floor(ms / 60_000)
  const days = Math.floor(totalMin / (60 * 24))
  const hours = Math.floor((totalMin % (60 * 24)) / 60)
  const mins = totalMin % 60
  if (days > 0) return `${days}d ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function fmtMonth(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()
}
function fmtDay(d: string) {
  return new Date(d).getDate()
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

// "Status pill" — Open / Closing soon / Starts in X / Closed
function statusFor(e: Event, nowMs: number): {
  label: string
  tone: 'green' | 'yellow' | 'orange' | 'grey'
  msToClose: number
  msToOpen: number
} | null {
  const w = eventWindow(e)
  if (!w) return null
  const msToOpen  = w.opensAt - nowMs
  const msToClose = w.closesAt - nowMs

  if (msToClose <= 0) return { label: 'Closed', tone: 'grey', msToClose, msToOpen }
  if (msToOpen > 0)   return { label: `Opens in ${fmtDuration(msToOpen)}`, tone: 'yellow', msToClose, msToOpen }
  if (msToClose < 60 * 60 * 1000) return { label: `${fmtDuration(msToClose)} left`, tone: 'orange', msToClose, msToOpen }
  return { label: `${fmtDuration(msToClose)} left`, tone: 'green', msToClose, msToOpen }
}

const TONE_CLASSES: Record<'green' | 'yellow' | 'orange' | 'grey', string> = {
  green:  'text-green-400 bg-green-500/15 border-green-500/30',
  yellow: 'text-stride-yellow-accent bg-stride-yellow-accent/15 border-stride-yellow-accent/30',
  orange: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  grey:   'text-white/45 bg-white/8 border-white/15',
}

export function RunnerTagCheckIn() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [eventStats, setEventStats] = useState<EventStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [runnerTag, setRunnerTag] = useState('')
  const [state, setState] = useState<CheckInState>({ status: 'idle' })
  const [now, setNow] = useState(() => Date.now())
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Live timer — re-render every second so countdowns stay fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Load events
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('events')
      .select('id, name, event_date, end_date')
      .in('status', ['PUBLISHED'])
      .order('event_date', { ascending: true })
      .then(({ data }) => setEvents(data ?? []))
  }, [])

  // Filter to events currently within their check-in window
  const eligibleEvents = useMemo(() => {
    return events
      .filter(e => {
        const w = eventWindow(e)
        return w && now < w.closesAt
      })
      .sort((a, b) => {
        // Sort: open-now first, then upcoming, by opensAt asc
        const wa = eventWindow(a)!
        const wb = eventWindow(b)!
        const aOpen = now >= wa.opensAt ? 0 : 1
        const bOpen = now >= wb.opensAt ? 0 : 1
        if (aOpen !== bOpen) return aOpen - bOpen
        return wa.opensAt - wb.opensAt
      })
  }, [events, now])

  const selectedEvent = useMemo(() => eligibleEvents.find(e => e.id === selectedEventId) ?? null, [eligibleEvents, selectedEventId])
  const selectedStatus = selectedEvent ? statusFor(selectedEvent, now) : null

  // Auto-clear selection if it falls out of the window
  useEffect(() => {
    if (selectedEventId && !eligibleEvents.find(e => e.id === selectedEventId)) {
      setSelectedEventId('')
      setState({ status: 'idle' })
    }
  }, [eligibleEvents, selectedEventId])

  // Click-outside to close picker
  useEffect(() => {
    if (!pickerOpen) return
    function onDown(e: MouseEvent | TouchEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [pickerOpen])

  // Stats fetch
  useEffect(() => {
    if (!selectedEventId) { setEventStats(null); return }
    setLoadingStats(true)
    const supabase = createClient()
    Promise.all([
      supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId)
        .eq('status', 'CONFIRMED'),
      supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId)
        .eq('status', 'CONFIRMED')
        .not('checked_in_at', 'is', null),
    ]).then(([{ count: total }, { count: checkedIn }]) => {
      setEventStats({ checkedIn: checkedIn ?? 0, total: total ?? 0 })
      setLoadingStats(false)
    })
  }, [selectedEventId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEventId || runnerTag.length !== 4) return
    setState({ status: 'loading' })

    try {
      const res = await fetch('/api/events/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runner_tag: runnerTag.toUpperCase(), event_id: selectedEventId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setState({ status: 'error', message: (data as { error?: string }).error ?? 'Check-in failed' })
      } else {
        const d = data as { attendeeName: string; eventName: string; runsCompleted: number; checkedInAt: string }
        setState({
          status: 'success',
          attendeeName: d.attendeeName,
          eventName: d.eventName,
          runsCompleted: d.runsCompleted,
          checkedInAt: d.checkedInAt,
        })
        setRunnerTag('')
        setEventStats(prev => prev ? { ...prev, checkedIn: prev.checkedIn + 1 } : null)
        setTimeout(() => inputRef.current?.focus(), 150)
      }
    } catch {
      setState({ status: 'error', message: 'Network error — please try again' })
    }
  }

  function handleReset() {
    setState({ status: 'idle' })
    setRunnerTag('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function pickEvent(id: string) {
    setSelectedEventId(id)
    setState({ status: 'idle' })
    setRunnerTag('')
    setPickerOpen(false)
  }

  const checkinPct = eventStats && eventStats.total > 0
    ? Math.round((eventStats.checkedIn / eventStats.total) * 100)
    : 0

  // Disabled if no eligible event selected OR the window has closed (defense in depth)
  const checkinDisabled = !selectedEvent || (selectedStatus?.msToClose ?? 0) <= 0 || state.status === 'loading'

  return (
    <div className='space-y-6'>

      {/* Event selector — custom rich dropdown */}
      <div className='flex flex-col gap-2'>
        <label className='text-white/70 text-sm font-medium'>Select event</label>

        <div ref={pickerRef} className='relative'>
          <button
            type='button'
            onClick={() => setPickerOpen(o => !o)}
            className='w-full bg-white/8 border border-white/20 rounded-xl px-3 py-3 text-left flex items-center gap-3 hover:border-white/30 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
            aria-expanded={pickerOpen}
          >
            {selectedEvent ? (
              <EventRow event={selectedEvent} status={selectedStatus} compact />
            ) : (
              <span className='flex-1 text-white/50 text-sm pl-1'>
                {eligibleEvents.length === 0
                  ? 'No events open for check-in right now'
                  : 'Choose an event…'}
              </span>
            )}
            <ChevronDown size={16} className={`shrink-0 text-white/40 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {pickerOpen && (
            <div className='absolute left-0 right-0 top-full mt-1 z-30 bg-stride-purple-primary border border-white/15 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto'>
              {eligibleEvents.length === 0 ? (
                <p className='px-4 py-6 text-center text-white/35 text-sm'>
                  No events are currently within their check-in window.
                </p>
              ) : (
                eligibleEvents.map(e => (
                  <button
                    key={e.id}
                    type='button'
                    onClick={() => pickEvent(e.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/8 last:border-b-0 ${
                      e.id === selectedEventId ? 'bg-stride-yellow-accent/8' : ''
                    }`}
                  >
                    <EventRow event={e} status={statusFor(e, now)} />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Live countdown timer for the selected event */}
        {selectedEvent && selectedStatus && (
          <div className={`mt-1 rounded-xl border px-3.5 py-2.5 flex items-center gap-2.5 text-xs ${TONE_CLASSES[selectedStatus.tone]}`}>
            <Clock size={13} className='shrink-0' />
            <div className='flex-1 min-w-0'>
              {selectedStatus.tone === 'grey' ? (
                <span className='font-semibold'>Check-in window has closed</span>
              ) : selectedStatus.tone === 'yellow' ? (
                <>
                  <span className='font-semibold'>Opens in {fmtDuration(selectedStatus.msToOpen)}</span>
                  <span className='opacity-70'> · then {fmtDuration(selectedStatus.msToClose - selectedStatus.msToOpen)} window</span>
                </>
              ) : (
                <>
                  <span className='font-semibold tabular-nums'>{fmtDuration(selectedStatus.msToClose)} left</span>
                  <span className='opacity-70'> to check runners in</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Stats bar */}
        {selectedEventId && (
          <div className='mt-1'>
            {loadingStats ? (
              <div className='h-7 bg-white/5 rounded-lg animate-pulse' />
            ) : eventStats ? (
              <div className='flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5'>
                <Users size={14} className='text-stride-yellow-accent shrink-0' />
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between mb-1'>
                    <span className='text-white/60 text-xs'>
                      <span className='text-white font-semibold'>{eventStats.checkedIn}</span>
                      {' '}/ {eventStats.total} checked in
                    </span>
                    <span className='text-white/40 text-xs'>{checkinPct}%</span>
                  </div>
                  <div className='h-1 bg-white/10 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-stride-yellow-accent rounded-full transition-all duration-500'
                      style={{ width: `${checkinPct}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Tag input */}
      <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
        <label className='text-white/70 text-sm font-medium'>Runner tag</label>

        <div className='bg-white/5 border-2 border-white/15 rounded-2xl p-4 flex flex-col items-center gap-3 focus-within:border-stride-yellow-accent/50 transition-colors'>
          <p className='text-white/30 text-xs uppercase tracking-widest'>Enter 4-character tag</p>
          <input
            ref={inputRef}
            type='text'
            value={runnerTag}
            onChange={e => {
              setRunnerTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))
              if (state.status !== 'idle') setState({ status: 'idle' })
            }}
            placeholder='K3X9'
            maxLength={4}
            autoComplete='off'
            autoCorrect='off'
            spellCheck={false}
            className='w-full bg-transparent text-white text-5xl font-mono tracking-[0.5em] text-center focus:outline-none placeholder:text-white/15 disabled:opacity-40'
            disabled={checkinDisabled}
          />
          <div className='flex gap-2'>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  runnerTag.length > i ? 'bg-stride-yellow-accent' : 'bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>

        <button
          type='submit'
          disabled={checkinDisabled || runnerTag.length !== 4}
          className='w-full py-3.5 bg-stride-yellow-accent text-copy-black font-bold rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stride-yellow-accent/90 active:scale-[0.98] transition-all text-base tracking-wide min-h-11'
        >
          {state.status === 'loading' ? 'Checking in…' : 'Check In →'}
        </button>
      </form>

      {/* Success */}
      {state.status === 'success' && (
        <div className='bg-green-500/10 border border-green-500/25 rounded-2xl p-5'>
          <div className='flex items-start gap-3 mb-4'>
            <div className='w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0'>
              <CheckCircle className='text-green-400' size={20} />
            </div>
            <div>
              <p className='text-green-400 font-bold text-lg leading-tight'>{state.attendeeName}</p>
              <p className='text-white/50 text-sm mt-0.5'>{state.eventName}</p>
            </div>
          </div>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className='bg-stride-yellow-accent/20 text-stride-yellow-accent text-xs font-bold px-2.5 py-1 rounded-full'>
                {state.runsCompleted} run{state.runsCompleted !== 1 ? 's' : ''}
              </span>
              <span className='text-white/35 text-xs'>
                {new Date(state.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <button
              onClick={handleReset}
              className='flex items-center gap-1.5 text-white/40 hover:text-white text-xs transition-colors'
            >
              <RotateCcw size={12} />
              Next runner
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {state.status === 'error' && (
        <div className='bg-red-500/10 border border-red-500/25 rounded-2xl p-5 flex items-start gap-3'>
          <div className='w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0'>
            <XCircle className='text-red-400' size={20} />
          </div>
          <div className='flex-1'>
            <p className='text-red-400 font-semibold'>Check-in failed</p>
            <p className='text-white/50 text-sm mt-0.5'>{state.message}</p>
            <button
              onClick={handleReset}
              className='mt-3 flex items-center gap-1.5 text-white/40 hover:text-white text-xs transition-colors'
            >
              <RotateCcw size={12} />
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Subcomponent ────────────────────────────────────────────────────────────

function EventRow({
  event, status, compact,
}: {
  event: Event
  status: ReturnType<typeof statusFor>
  compact?: boolean
}) {
  const date = event.event_date
  return (
    <>
      {/* Calendar chip */}
      <div className='w-11 h-11 rounded-xl bg-white/8 border border-white/12 flex flex-col items-center justify-center shrink-0 leading-none gap-0.5'>
        {date ? (
          <>
            <span className='text-stride-yellow-accent text-[8px] font-black uppercase tracking-widest'>
              {fmtMonth(date)}
            </span>
            <span className='text-white font-bold text-base leading-none'>
              {fmtDay(date)}
            </span>
          </>
        ) : (
          <Calendar size={14} className='text-white/40' />
        )}
      </div>

      <div className='flex-1 min-w-0'>
        <p className={`text-white font-semibold leading-snug truncate ${compact ? 'text-sm' : 'text-sm'}`}>
          {event.name}
        </p>
        <p className='text-white/45 text-xs truncate mt-0.5'>
          {date ? `${fmtDate(date)} · ${fmtTime(date)}` : 'Date TBD'}
        </p>
      </div>

      {status && (
        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${TONE_CLASSES[status.tone]}`}>
          {status.label}
        </span>
      )}
    </>
  )
}
