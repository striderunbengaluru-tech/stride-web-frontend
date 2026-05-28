'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search, CheckCircle, Clock } from 'lucide-react'
import type { RunnerRow, EventWithAttendees } from '@/app/admin/registrations/page'
import { RunnerTagBadge } from '@/components/ui/runner-tag-badge'

type Props = {
  runners: RunnerRow[]
  events: EventWithAttendees[]
  totalConfirmed: number
}

type Tab = 'runners' | 'events'

const ROLE_PILL: Record<string, string> = {
  ADMIN: 'bg-stride-yellow-accent/20 text-stride-yellow-accent',
  MEMBER: 'bg-blue-500/20 text-blue-400',
  GUEST: 'bg-white/10 text-white/50',
}

const STATUS_PILL: Record<string, string> = {
  CONFIRMED: 'bg-green-500/15 text-green-400',
  PENDING: 'bg-yellow-500/15 text-yellow-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function CapacityBar({ confirmed, capacity }: { confirmed: number; capacity: number | null }) {
  if (!capacity) return <span className='text-white/30 text-xs'>No limit</span>
  const pct = Math.min(100, Math.round((confirmed / capacity) * 100))
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className='flex items-center gap-2'>
      <div className='w-20 bg-white/10 rounded-full h-1.5 overflow-hidden'>
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className='text-white/50 text-xs tabular-nums'>{confirmed}/{capacity}</span>
    </div>
  )
}

export function RegistrationsClient({ runners, events, totalConfirmed }: Props) {
  const [tab, setTab] = useState<Tab>('runners')
  const [search, setSearch] = useState('')
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

  const filteredRunners = useMemo(() => {
    if (!search.trim()) return runners
    const q = search.toLowerCase()
    return runners.filter(r =>
      r.full_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.username?.toLowerCase().includes(q) ||
      r.runner_tag?.toLowerCase().includes(q)
    )
  }, [runners, search])

  const filteredEvents = useMemo(() => {
    if (!search.trim()) return events
    const q = search.toLowerCase()
    return events.filter(e => e.name.toLowerCase().includes(q))
  }, [events, search])

  return (
    <div>
      {/* Tab bar + search */}
      <div className='flex flex-col sm:flex-row gap-3 mb-6'>
        <div className='flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1'>
          <button
            onClick={() => setTab('runners')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'runners' ? 'bg-stride-yellow-accent text-copy-black shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            All runners
            <span className='ml-1.5 text-xs opacity-60'>({runners.length})</span>
          </button>
          <button
            onClick={() => setTab('events')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'events' ? 'bg-stride-yellow-accent text-copy-black shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            By event
            <span className='ml-1.5 text-xs opacity-60'>({events.length})</span>
          </button>
        </div>

        <div className='relative flex-1 sm:max-w-xs'>
          <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
          <input
            type='text'
            placeholder={tab === 'runners' ? 'Search name, email, tag…' : 'Search event name…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='w-full bg-white/8 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
          />
        </div>
      </div>

      {/* ── Tab A: All Runners ── */}
      {tab === 'runners' && (
        <>
          {filteredRunners.length === 0 ? (
            <div className='bg-white/10 border border-white/15 rounded-xl p-12 text-center'>
              <p className='text-white/40'>{search ? 'No runners match your search.' : 'No registrations yet.'}</p>
            </div>
          ) : (
            <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden'>
              {/* Desktop table */}
              <div className='hidden md:block overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-white/10'>
                      <th className='text-left text-white/40 font-medium px-5 py-3.5 text-xs uppercase tracking-wider'>Tag</th>
                      <th className='text-left text-white/40 font-medium px-5 py-3.5 text-xs uppercase tracking-wider'>Runner</th>
                      <th className='text-left text-white/40 font-medium px-5 py-3.5 text-xs uppercase tracking-wider'>Confirmed</th>
                      <th className='text-left text-white/40 font-medium px-5 py-3.5 text-xs uppercase tracking-wider'>Checked In</th>
                      <th className='text-left text-white/40 font-medium px-5 py-3.5 text-xs uppercase tracking-wider'>Last Event</th>
                      <th className='text-left text-white/40 font-medium px-5 py-3.5 text-xs uppercase tracking-wider'>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRunners.map(r => (
                      <tr key={r.user_id} className='border-b border-white/5 hover:bg-white/[0.03] transition-colors'>
                        <td className='px-5 py-3.5'>
                          {r.runner_tag
                            ? <RunnerTagBadge tag={r.runner_tag} size='sm' />
                            : <span className='text-white/20 text-xs'>—</span>}
                        </td>
                        <td className='px-5 py-3.5'>
                          <p className='text-white font-medium'>{r.full_name ?? '—'}</p>
                          <p className='text-white/40 text-xs mt-0.5'>{r.email}</p>
                          {r.username && <p className='text-white/25 text-xs'>@{r.username}</p>}
                        </td>
                        <td className='px-5 py-3.5'>
                          <span className='text-white font-semibold tabular-nums'>{r.confirmed_count}</span>
                          <span className='text-white/30 text-xs ml-1'>runs</span>
                        </td>
                        <td className='px-5 py-3.5'>
                          <div className='flex items-center gap-1.5'>
                            {r.checked_in_count > 0
                              ? <CheckCircle size={12} className='text-green-400' />
                              : <Clock size={12} className='text-white/20' />
                            }
                            <span className={`tabular-nums text-sm ${r.checked_in_count > 0 ? 'text-green-400' : 'text-white/30'}`}>
                              {r.checked_in_count}
                            </span>
                          </div>
                        </td>
                        <td className='px-5 py-3.5'>
                          {r.last_event_name ? (
                            <>
                              <p className='text-white/70 text-sm line-clamp-1'>{r.last_event_name}</p>
                              <p className='text-white/30 text-xs mt-0.5'>{fmtDate(r.last_event_date)}</p>
                            </>
                          ) : <span className='text-white/20 text-xs'>—</span>}
                        </td>
                        <td className='px-5 py-3.5'>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${ROLE_PILL[r.role] ?? 'bg-white/10 text-white/50'}`}>
                            {r.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className='md:hidden divide-y divide-white/5'>
                {filteredRunners.map(r => (
                  <div key={r.user_id} className='px-4 py-4'>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <div className='flex items-center gap-2 mb-1'>
                          {r.runner_tag
                            ? <RunnerTagBadge tag={r.runner_tag} size='xs' />
                            : <span className='text-white/20 text-xs font-mono'>—</span>}
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${ROLE_PILL[r.role] ?? ''}`}>
                            {r.role}
                          </span>
                        </div>
                        <p className='text-white font-medium text-sm'>{r.full_name ?? '—'}</p>
                        <p className='text-white/40 text-xs'>{r.email}</p>
                      </div>
                      <div className='text-right shrink-0'>
                        <p className='text-white font-bold'>{r.confirmed_count}</p>
                        <p className='text-white/30 text-xs'>runs</p>
                      </div>
                    </div>
                    {r.last_event_name && (
                      <p className='text-white/30 text-xs mt-2'>Last: {r.last_event_name}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab B: By Event ── */}
      {tab === 'events' && (
        <>
          {filteredEvents.length === 0 ? (
            <div className='bg-white/10 border border-white/15 rounded-xl p-12 text-center'>
              <p className='text-white/40'>{search ? 'No events match your search.' : 'No events yet.'}</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {filteredEvents.map(event => {
                const isExpanded = expandedEventId === event.id
                const isPast = event.event_date ? new Date(event.event_date) < new Date() : false

                return (
                  <div key={event.id} className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden'>
                    {/* Event header row */}
                    <button
                      onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                      className='w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left'
                    >
                      {/* Date chip */}
                      <div className='w-10 h-10 shrink-0 rounded-lg bg-white/10 flex flex-col items-center justify-center leading-none'>
                        {event.event_date ? (
                          <>
                            <span className='text-stride-yellow-accent text-[8px] font-bold uppercase tracking-widest'>
                              {new Date(event.event_date).toLocaleDateString('en-IN', { month: 'short' })}
                            </span>
                            <span className='text-white font-bold text-sm'>
                              {new Date(event.event_date).getDate()}
                            </span>
                          </>
                        ) : <span className='text-white/30 text-xs'>—</span>}
                      </div>

                      {/* Event info */}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <p className='text-white font-semibold text-sm line-clamp-1'>{event.name}</p>
                          {isPast && (
                            <span className='text-white/30 text-xs bg-white/10 px-1.5 py-0.5 rounded'>Completed</span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            event.price_paise === 0 ? 'bg-green-500/15 text-green-400' : 'bg-white/10 text-white/50'
                          }`}>
                            {event.price_paise === 0 ? 'Free' : `₹${event.price_paise / 100}`}
                          </span>
                        </div>
                        <div className='flex items-center gap-4 mt-1.5 flex-wrap'>
                          <span className='text-white/50 text-xs'>
                            {event.confirmed_count} confirmed
                          </span>
                          <span className='text-green-400 text-xs flex items-center gap-1'>
                            <CheckCircle size={10} />
                            {event.checked_in_count} checked in
                          </span>
                          <CapacityBar confirmed={event.confirmed_count} capacity={event.capacity} />
                        </div>
                      </div>

                      {/* Expand chevron */}
                      <div className='shrink-0 text-white/30'>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {/* Expanded attendee list */}
                    {isExpanded && (
                      <div className='border-t border-white/10'>
                        {event.attendees.length === 0 ? (
                          <p className='text-white/30 text-sm px-5 py-6 text-center'>No registrations for this event.</p>
                        ) : (
                          <>
                            {/* Desktop table */}
                            <div className='hidden md:block overflow-x-auto'>
                              <table className='w-full text-sm'>
                                <thead>
                                  <tr className='border-b border-white/5'>
                                    <th className='text-left text-white/30 font-medium px-5 py-3 text-xs uppercase tracking-wider'>Tag</th>
                                    <th className='text-left text-white/30 font-medium px-5 py-3 text-xs uppercase tracking-wider'>Runner</th>
                                    <th className='text-left text-white/30 font-medium px-5 py-3 text-xs uppercase tracking-wider'>Status</th>
                                    <th className='text-left text-white/30 font-medium px-5 py-3 text-xs uppercase tracking-wider'>Registered</th>
                                    <th className='text-left text-white/30 font-medium px-5 py-3 text-xs uppercase tracking-wider'>Checked In</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {event.attendees.map(a => (
                                    <tr key={a.registration_id} className='border-b border-white/[0.04] hover:bg-white/[0.02]'>
                                      <td className='px-5 py-3'>
                                        {a.runner_tag
                                          ? <RunnerTagBadge tag={a.runner_tag} size='xs' />
                                          : <span className='text-white/20 text-xs'>—</span>}
                                      </td>
                                      <td className='px-5 py-3'>
                                        <p className='text-white/80 font-medium text-sm'>{a.full_name ?? '—'}</p>
                                        <p className='text-white/30 text-xs'>{a.email}</p>
                                      </td>
                                      <td className='px-5 py-3'>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${STATUS_PILL[a.status] ?? 'bg-white/10 text-white/50'}`}>
                                          {a.status}
                                        </span>
                                      </td>
                                      <td className='px-5 py-3 text-white/40 text-xs'>
                                        {fmtDate(a.registered_at)}
                                      </td>
                                      <td className='px-5 py-3'>
                                        {a.checked_in_at ? (
                                          <span className='text-green-400 text-xs flex items-center gap-1'>
                                            <CheckCircle size={11} />
                                            {fmtTime(a.checked_in_at)}
                                          </span>
                                        ) : (
                                          <span className='text-white/20 text-xs'>—</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile list */}
                            <div className='md:hidden divide-y divide-white/5'>
                              {event.attendees.map(a => (
                                <div key={a.registration_id} className='px-4 py-3 flex items-center gap-3'>
                                  <div className='shrink-0'>
                                    {a.runner_tag
                                      ? <RunnerTagBadge tag={a.runner_tag} size='xs' />
                                      : <span className='text-white/20 text-xs font-mono'>—</span>}
                                  </div>
                                  <div className='flex-1 min-w-0'>
                                    <p className='text-white/80 text-sm font-medium truncate'>{a.full_name ?? '—'}</p>
                                    <p className='text-white/30 text-xs truncate'>{a.email}</p>
                                  </div>
                                  <div className='shrink-0 text-right'>
                                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${STATUS_PILL[a.status] ?? ''}`}>
                                      {a.status}
                                    </span>
                                    {a.checked_in_at && (
                                      <p className='text-green-400 text-xs mt-0.5'>{fmtTime(a.checked_in_at)}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
