'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle } from 'lucide-react'

type Event = { id: string; name: string; event_date: string | null }

type CheckInState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; attendeeName: string; eventName: string; runsCompleted: number; checkedInAt: string }
  | { status: 'error'; message: string }

export function RunnerTagCheckIn() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
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
        setState({ status: 'error', message: data.error ?? 'Check-in failed' })
      } else {
        setState({
          status: 'success',
          attendeeName: data.attendeeName,
          eventName: data.eventName,
          runsCompleted: data.runsCompleted,
          checkedInAt: data.checkedInAt,
        })
        setRunnerTag('')
        setTimeout(() => inputRef.current?.focus(), 150)
      }
    } catch {
      setState({ status: 'error', message: 'Network error — please try again' })
    }
  }

  return (
    <div className='space-y-6'>

      {/* Event selector */}
      <div>
        <label className='block text-white/60 text-xs uppercase tracking-widest mb-2'>
          Select Event
        </label>
        <select
          value={selectedEventId}
          onChange={e => { setSelectedEventId(e.target.value); setState({ status: 'idle' }) }}
          className='w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-stride-yellow-accent/60 appearance-none cursor-pointer'
        >
          <option value='' className='bg-[#4B2862]'>Select an event…</option>
          {events.map(event => (
            <option key={event.id} value={event.id} className='bg-[#4B2862]'>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tag input form */}
      <form onSubmit={handleSubmit}>
        <label className='block text-white/60 text-xs uppercase tracking-widest mb-2'>
          Runner Tag
        </label>
        <div className='flex gap-3'>
          <input
            ref={inputRef}
            type='text'
            value={runnerTag}
            onChange={e => {
              setRunnerTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))
              setState({ status: 'idle' })
            }}
            placeholder='K3X9'
            maxLength={4}
            autoComplete='off'
            autoCorrect='off'
            spellCheck={false}
            className='flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-3xl font-mono tracking-[0.35em] text-center focus:outline-none focus:border-stride-yellow-accent/60 placeholder:text-white/20 disabled:opacity-50'
            disabled={!selectedEventId || state.status === 'loading'}
          />
          <button
            type='submit'
            disabled={!selectedEventId || runnerTag.length !== 4 || state.status === 'loading'}
            className='px-6 py-3 bg-stride-yellow-accent text-copy-black font-semibold rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stride-yellow-accent/90 transition-colors whitespace-nowrap'
          >
            {state.status === 'loading' ? 'Checking…' : 'Check In'}
          </button>
        </div>
      </form>

      {/* Success state */}
      {state.status === 'success' && (
        <div className='bg-green-500/10 border border-green-500/25 rounded-xl p-5 flex items-start gap-4'>
          <CheckCircle className='text-green-400 shrink-0 mt-0.5' size={22} />
          <div>
            <p className='text-green-400 font-semibold text-base'>{state.attendeeName} checked in!</p>
            <p className='text-white/50 text-sm mt-0.5'>{state.eventName}</p>
            <p className='text-white/35 text-xs mt-1'>
              {state.runsCompleted} run{state.runsCompleted !== 1 ? 's' : ''} completed ·{' '}
              {new Date(state.checkedInAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {state.status === 'error' && (
        <div className='bg-red-500/10 border border-red-500/25 rounded-xl p-5 flex items-start gap-4'>
          <XCircle className='text-red-400 shrink-0 mt-0.5' size={22} />
          <div className='flex-1'>
            <p className='text-red-400 font-semibold'>Check-in failed</p>
            <p className='text-white/50 text-sm mt-0.5'>{state.message}</p>
            <button
              onClick={() => { setState({ status: 'idle' }); inputRef.current?.focus() }}
              className='mt-3 text-xs text-white/40 hover:text-white/70 transition-colors'
            >
              Try again →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
