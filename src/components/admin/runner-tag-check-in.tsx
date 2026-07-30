'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle, XCircle, ChevronDown, RotateCcw, Users, Clock, Calendar,
  Search, Hash, UserRound, CheckCircle2,
} from 'lucide-react'
import {
  formatMonthIST, formatDayIST, formatDateShortIST, formatTimeIST,
} from '@/lib/utils/ist'

type Event = {
  id: string
  name: string
  event_date: string | null
  end_date: string | null
}
type EventStats = { checkedIn: number; total: number }

type Attendee = {
  registrationId: string
  userId: string | null
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  runnerTag: string | null
  checkedInAt: string | null
}

type CheckInState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; attendeeName: string; eventName: string; runsCompleted: number; checkedInAt: string; countedTowardRuns: boolean }
  | { status: 'error'; message: string }

type Mode = 'tag' | 'search'

// Check-in is allowed from event_date - 6h up to end_date + 24h (or event_date + 24h if no end_date).
const CHECKIN_PRE_WINDOW_MS = 6 * 60 * 60 * 1000
const CHECKIN_POST_WINDOW_MS = 24 * 60 * 60 * 1000

// How often the attendee list re-reads while the tab is visible. 3s is the
// latency budget for "two admins never see the same runner as available"; each
// poll is a `since` delta, so the usual response carries zero rows.
const ATTENDEE_POLL_MS = 3_000
// Every Nth poll takes the full list instead. A delta surfaces check-ins but not
// someone who REGISTERS after check-in opened, so ~18s covers that case too.
const ATTENDEE_RESYNC_EVERY = 6

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

// IST-pinned — see @/lib/utils/event-date.
const fmtMonth = formatMonthIST
const fmtDay = formatDayIST
const fmtDate = formatDateShortIST
const fmtTime = formatTimeIST

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
  const [runnerTag, setRunnerTag] = useState('')
  const [state, setState] = useState<CheckInState>({ status: 'idle' })
  const [now, setNow] = useState(() => Date.now())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('tag')

  // Search-mode state
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  // Per-row check-in progress
  const [rowLoadingId, setRowLoadingId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Live timer
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

  // Check-in counter derived from the admin-gated attendee list (below) rather
  // than a browser-side count query: that query ran through the RLS-scoped
  // anon client and could only see the admin's OWN registrations, so it showed
  // a bogus "0 / 1". The attendee list comes from /api/admin/event-attendees
  // (service role), so counting it gives the true checked-in / total figures —
  // and it updates automatically as attendees are optimistically checked in.
  const eventStats = useMemo<EventStats | null>(() => {
    if (!selectedEventId) return null
    return {
      total: attendees.length,
      checkedIn: attendees.filter(a => a.checkedInAt).length,
    }
  }, [selectedEventId, attendees])

  // ── Attendee list: initial load + live polling ─────────────────────────────
  // Several admins check runners in from separate phones at the same run. Without
  // refreshing, each device kept showing everyone as un-checked-in and two admins
  // would work the same athlete. (The check-in API is already race-safe — the
  // loser gets "Already checked in" — so this removes the confusion, not a
  // correctness hole.)
  //
  // `lastSync` is the server's own clock, not the browser's: a phone whose clock
  // is a minute fast would ask for changes "since" a future instant and silently
  // miss every check-in.
  const lastSyncRef = useRef<string | null>(null)
  // Bumped on every local mutation. A poll that was already in flight when a
  // check-in landed resolves with pre-check-in data; comparing sequence numbers
  // lets us drop it instead of wiping the row we just marked.
  const mutationSeqRef = useRef(0)
  const pollTickRef = useRef(0)

  const fetchAttendees = useCallback(async (eventId: string, since: string | null) => {
    const params = new URLSearchParams({ eventId })
    if (since) params.set('since', since)
    const res = await fetch(`/api/admin/event-attendees?${params}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`attendees ${res.status}`)
    return await res.json() as { attendees: Attendee[]; serverTime: string; mode: 'full' | 'delta' }
  }, [])

  // Full list, with the skeleton. Used on event selection and for the periodic
  // resync that picks up runners who registered after check-in opened.
  const loadAttendees = useCallback(async (eventId: string, opts?: { quiet?: boolean }) => {
    const seenSeq = mutationSeqRef.current
    if (!opts?.quiet) setLoadingAttendees(true)
    try {
      const data = await fetchAttendees(eventId, null)
      if (mutationSeqRef.current !== seenSeq) return
      setAttendees(data.attendees)
      lastSyncRef.current = data.serverTime
    } catch {
      if (!opts?.quiet) setAttendees([])
    } finally {
      if (!opts?.quiet) setLoadingAttendees(false)
    }
  }, [fetchAttendees])

  // Silent delta merge. Rows only ever gain a checkedInAt, so merging by
  // registrationId is complete — and a payload of zero rows is the common case.
  const refreshAttendees = useCallback(async (eventId: string) => {
    const since = lastSyncRef.current
    if (!since) { await loadAttendees(eventId, { quiet: true }); return }

    const seenSeq = mutationSeqRef.current
    try {
      const data = await fetchAttendees(eventId, since)
      if (mutationSeqRef.current !== seenSeq) return
      lastSyncRef.current = data.serverTime
      if (data.attendees.length === 0) return
      setAttendees(prev => {
        const updates = new Map(data.attendees.map(a => [a.registrationId, a]))
        return prev.map(a => updates.get(a.registrationId) ?? a)
      })
    } catch {
      // A dropped poll is not worth surfacing — the next tick retries.
    }
  }, [fetchAttendees, loadAttendees])

  useEffect(() => {
    if (!selectedEventId) {
      setAttendees([])
      lastSyncRef.current = null
      return
    }
    lastSyncRef.current = null
    pollTickRef.current = 0
    loadAttendees(selectedEventId)
  }, [selectedEventId, loadAttendees])

  // The poll loop. Paused entirely while the tab is hidden — a phone in a pocket
  // shouldn't be hitting the API — and refetches immediately on refocus so the
  // list is current the instant an admin looks at it again.
  useEffect(() => {
    if (!selectedEventId) return

    function tick() {
      pollTickRef.current += 1
      // Every ATTENDEE_RESYNC_EVERY-th tick, take the whole list instead of a
      // delta: a delta reports check-ins but can't reveal a new registration.
      if (pollTickRef.current % ATTENDEE_RESYNC_EVERY === 0) {
        void loadAttendees(selectedEventId, { quiet: true })
      } else {
        void refreshAttendees(selectedEventId)
      }
    }

    let id = document.visibilityState === 'visible'
      ? window.setInterval(tick, ATTENDEE_POLL_MS)
      : 0

    function onVisibility() {
      window.clearInterval(id)
      id = 0
      if (document.visibilityState !== 'visible') return
      void refreshAttendees(selectedEventId)
      id = window.setInterval(tick, ATTENDEE_POLL_MS)
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onVisibility)
    }
  }, [selectedEventId, loadAttendees, refreshAttendees])

  // Local filter for the search input
  const filteredAttendees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return attendees
    return attendees.filter(a =>
      a.fullName?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.runnerTag?.toLowerCase().includes(q)
    )
  }, [attendees, searchQuery])

  async function performCheckIn(tag: string, options?: { quiet?: boolean }) {
    if (!selectedEventId || !tag || tag.length !== 4) return
    if (!options?.quiet) setState({ status: 'loading' })

    try {
      const res = await fetch('/api/events/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runner_tag: tag.toUpperCase(), event_id: selectedEventId }),
      })
      const data = await res.json()
      if (!res.ok) {
        const message = (data as { error?: string }).error ?? 'Check-in failed'
        setState({ status: 'error', message })
        // Another admin got there first — pull their check-in in immediately so
        // this device stops offering the same runner.
        if (res.status === 409) {
          mutationSeqRef.current += 1
          void loadAttendees(selectedEventId, { quiet: true })
          toast.error(message)
        }
        return false
      }
      const d = data as { attendeeName: string; eventName: string; runsCompleted: number; checkedInAt: string; countedTowardRuns?: boolean }
      setState({
        status: 'success',
        attendeeName: d.attendeeName,
        eventName: d.eventName,
        runsCompleted: d.runsCompleted,
        // Absent on an older deploy — treat as counted, the previous behaviour.
        countedTowardRuns: d.countedTowardRuns !== false,
        checkedInAt: d.checkedInAt,
      })
      // Optimistically mark in the search list — the counter is derived from
      // this list, so it advances in lockstep without a separate update. Bumping
      // the mutation sequence first invalidates any poll already in flight, which
      // would otherwise resolve with pre-check-in data and undo this.
      mutationSeqRef.current += 1
      setAttendees(prev => prev.map(a => a.runnerTag?.toUpperCase() === tag.toUpperCase()
        ? { ...a, checkedInAt: d.checkedInAt }
        : a))
      // Then confirm against the server, so this device holds truth rather than
      // an optimistic guess — and picks up anything the other admins just did.
      void loadAttendees(selectedEventId, { quiet: true })
      return true
    } catch {
      setState({ status: 'error', message: 'Network error — please try again' })
      return false
    }
  }

  async function handleTagSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await performCheckIn(runnerTag)
    if (ok) {
      setRunnerTag('')
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }

  async function handleSearchCheckIn(attendee: Attendee) {
    if (!attendee.runnerTag || attendee.checkedInAt) return
    setRowLoadingId(attendee.registrationId)
    await performCheckIn(attendee.runnerTag)
    setRowLoadingId(null)
  }

  function handleReset() {
    setState({ status: 'idle' })
    setRunnerTag('')
    if (mode === 'tag') setTimeout(() => inputRef.current?.focus(), 50)
    else setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  function pickEvent(id: string) {
    setSelectedEventId(id)
    setState({ status: 'idle' })
    setRunnerTag('')
    setSearchQuery('')
    setPickerOpen(false)
  }

  function switchMode(next: Mode) {
    setMode(next)
    setState({ status: 'idle' })
    setRunnerTag('')
    setSearchQuery('')
    setTimeout(() => {
      if (next === 'tag') inputRef.current?.focus()
      else searchInputRef.current?.focus()
    }, 50)
  }

  const checkinPct = eventStats && eventStats.total > 0
    ? Math.round((eventStats.checkedIn / eventStats.total) * 100)
    : 0

  const windowClosed = (selectedStatus?.msToClose ?? 0) <= 0
  const checkinDisabled = !selectedEvent || windowClosed || state.status === 'loading'

  return (
    <div className='space-y-6'>

      {/* Event selector */}
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

        {/* Countdown */}
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

        {/* Stats */}
        {selectedEventId && (
          <div className='mt-1'>
            {loadingAttendees && attendees.length === 0 ? (
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

      {/* Helper hint when no event has been picked yet — keeps the page from
          looking empty without rendering an unusable tag input. */}
      {!selectedEvent && eligibleEvents.length > 0 && (
        <div className='rounded-xl border border-dashed border-white/15 bg-white/3 px-4 py-6 text-center'>
          <p className='text-white/45 text-sm'>Pick an event above to start checking runners in.</p>
        </div>
      )}

      {/* ── Mode toggle + body — only after an event is selected ── */}
      {selectedEvent && (
        <>
          <div className='flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1'>
            <button
              type='button'
              onClick={() => switchMode('tag')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                mode === 'tag'
                  ? 'bg-stride-yellow-accent text-copy-black shadow-sm'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <Hash size={14} />
              Tag entry
            </button>
            <button
              type='button'
              onClick={() => switchMode('search')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                mode === 'search'
                  ? 'bg-stride-yellow-accent text-copy-black shadow-sm'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <Search size={14} />
              Search by name
            </button>
          </div>

      {/* ── Mode body ── */}
      {mode === 'tag' ? (
        <form onSubmit={handleTagSubmit} className='flex flex-col gap-3'>
          <label className='text-white/70 text-sm font-medium'>Runner tag</label>
          <div className='bg-white/5 border-2 border-white/15 rounded-2xl p-4 flex flex-col items-center gap-3 focus-within:border-stride-yellow-accent/50 transition-colors'>
            <p className='text-white/30 text-xs font-mono uppercase tracking-widest'>Enter 4-character tag</p>
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
      ) : (
        // ── Search mode ──
        <div className='flex flex-col gap-3'>
          <label className='text-white/70 text-sm font-medium'>Search the runners signed up for this event</label>

          {/* Search input */}
          <div className='relative'>
            <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none' />
            <input
              ref={searchInputRef}
              type='text'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Search name, email, or tag…'
              autoComplete='off'
              autoCorrect='off'
              spellCheck={false}
              className='w-full bg-white/8 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors min-h-11'
              disabled={!selectedEvent || windowClosed}
            />
          </div>

          {/* Attendee list */}
          {!selectedEvent ? (
            <div className='rounded-xl border border-white/10 bg-white/3 px-4 py-8 text-center'>
              <p className='text-white/35 text-sm'>Select an event above to search runners.</p>
            </div>
          ) : loadingAttendees ? (
            <div className='space-y-2'>
              {[0, 1, 2].map(i => (
                <div key={i} className='h-14 bg-white/5 rounded-xl animate-pulse' />
              ))}
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className='rounded-xl border border-white/10 bg-white/3 px-4 py-8 text-center'>
              <p className='text-white/35 text-sm'>
                {searchQuery
                  ? 'No runners match your search.'
                  : 'No confirmed runners for this event yet.'}
              </p>
            </div>
          ) : (
            <div className='flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1 -mr-1'>
              {filteredAttendees.map(a => {
                const isCheckedIn = !!a.checkedInAt
                const isRowLoading = rowLoadingId === a.registrationId
                const initial = (a.fullName ?? '?').charAt(0).toUpperCase()

                return (
                  <div
                    key={a.registrationId}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      isCheckedIn
                        ? 'bg-green-500/5 border-green-500/15'
                        : 'bg-white/4 border-white/10'
                    }`}
                  >
                    {/* Avatar */}
                    <div className='shrink-0 w-10 h-10 rounded-full overflow-hidden bg-stride-yellow-accent/20 border border-white/10 flex items-center justify-center'>
                      {a.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatarUrl} alt={a.fullName ?? ''} className='w-full h-full object-cover' loading='lazy' fetchPriority='low' referrerPolicy='no-referrer' />
                      ) : (
                        <UserRound size={16} className='text-stride-yellow-accent' />
                      )}
                    </div>

                    {/* Name + email */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-1.5'>
                        <p className='text-white font-semibold text-sm truncate'>{a.fullName ?? '—'}</p>
                        {a.runnerTag && (
                          <span className='shrink-0 text-stride-yellow-accent text-[10px] font-bold font-mono tracking-wider bg-stride-yellow-accent/10 border border-stride-yellow-accent/20 rounded px-1.5 py-0.5'>
                            {a.runnerTag}
                          </span>
                        )}
                      </div>
                      <p className='text-white/40 text-xs truncate'>{a.email}</p>
                    </div>

                    {/* Action */}
                    <div className='shrink-0'>
                      {isCheckedIn ? (
                        <div className='flex items-center gap-1 text-green-400 text-xs font-medium px-2.5 py-1.5 rounded-md bg-green-500/10'>
                          <CheckCircle2 size={13} />
                          <span className='hidden sm:inline'>Checked in</span>
                          <span className='sm:hidden tabular-nums'>{a.checkedInAt ? fmtTime(a.checkedInAt) : ''}</span>
                          <span className='hidden sm:inline tabular-nums opacity-70'>· {a.checkedInAt ? fmtTime(a.checkedInAt) : ''}</span>
                        </div>
                      ) : (
                        <button
                          type='button'
                          onClick={() => handleSearchCheckIn(a)}
                          disabled={!a.runnerTag || isRowLoading || windowClosed}
                          title={!a.runnerTag ? 'This runner has no tag assigned yet.' : undefined}
                          className='inline-flex items-center gap-1.5 bg-stride-yellow-accent text-copy-black font-bold rounded-md px-3 py-2 text-xs hover:bg-stride-yellow-accent/90 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-9'
                        >
                          {isRowLoading
                            ? '…'
                            : <>
                                <CheckCircle size={13} />
                                <span className='hidden sm:inline'>Check in</span>
                              </>}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* Success — shared across both modes */}
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
                {formatTimeIST(state.checkedInAt)}
              </span>
              {/* Without this the run count simply doesn't move and the admin is
                  left wondering whether the check-in worked. */}
              {!state.countedTowardRuns && (
                <span
                  title='Test event — checked in, but it does not count toward runs or the leaderboard.'
                  className='bg-white/10 text-white/55 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full'
                >
                  Test · not counted
                </span>
              )}
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

      {/* Error — shared */}
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
      <div className='w-11 h-11 rounded-xl bg-white/8 border border-white/12 flex flex-col items-center justify-center shrink-0 leading-none gap-0.5'>
        {date ? (
          <>
            <span className='text-stride-yellow-accent text-[8px] font-black font-mono uppercase tracking-widest'>
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
        <span className={`shrink-0 text-[10px] font-bold font-mono uppercase tracking-wider px-2 py-1 rounded-md border ${TONE_CLASSES[status.tone]}`}>
          {status.label}
        </span>
      )}
    </>
  )
}
