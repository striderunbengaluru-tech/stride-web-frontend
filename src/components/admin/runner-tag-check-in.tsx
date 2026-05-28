'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, ChevronDown, RotateCcw, Users } from 'lucide-react'

type Event = { id: string; name: string; event_date: string | null }
type EventStats = { checkedIn: number; total: number }

type CheckInState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; attendeeName: string; eventName: string; runsCompleted: number; checkedInAt: string }
  | { status: 'error'; message: string }

export function RunnerTagCheckIn() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [eventStats, setEventStats] = useState<EventStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [runnerTag, setRunnerTag] = useState('')
  const [state, setState] = useState<CheckInState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('events')
      .select('id, name, event_date')
      .in('status', ['PUBLISHED'])
      .order('event_date', { ascending: false })
      .then(({ data }) => setEvents(data ?? []))
  }, [])

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
        // Refresh stats
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

  const checkinPct = eventStats && eventStats.total > 0
    ? Math.round((eventStats.checkedIn / eventStats.total) * 100)
    : 0

  return (
    <div className='space-y-6'>

      {/* Event selector */}
      <div className='flex flex-col gap-2'>
        <label className='text-white/70 text-sm font-medium'>Select event</label>
        <div className='relative'>
          <select
            value={selectedEventId}
            onChange={e => { setSelectedEventId(e.target.value); setState({ status: 'idle' }); setRunnerTag('') }}
            className='w-full bg-white/8 border border-white/20 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-stride-yellow-accent/60 appearance-none cursor-pointer pr-10'
          >
            <option value='' className='bg-[#4B2862]'>Choose an event…</option>
            {events.map(event => (
              <option key={event.id} value={event.id} className='bg-[#4B2862]'>
                {event.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className='absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none' />
        </div>

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

        {/* Big tag input */}
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
            disabled={!selectedEventId || state.status === 'loading'}
          />
          {/* Character dots */}
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
          disabled={!selectedEventId || runnerTag.length !== 4 || state.status === 'loading'}
          className='w-full py-3.5 bg-stride-yellow-accent text-copy-black font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stride-yellow-accent/90 active:scale-[0.98] transition-all text-base tracking-wide'
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
