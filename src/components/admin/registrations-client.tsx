'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Search, CheckCircle, Clock, Pencil, ExternalLink, Users, Calendar } from 'lucide-react'
import type { RunnerRow, EventWithAttendees } from '@/app/admin/registrations/page'
import { RunnerTagBadge } from '@/components/ui/runner-tag-badge'
import { formatMonthIST, formatDayIST } from '@/lib/utils/ist'
import { formatDateNumericIST, formatTimeIST } from '@/lib/utils/ist'
import { priceLabel as priceOf } from '@/lib/utils/money'

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
  PENDING:   'bg-yellow-500/15 text-yellow-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

function fmtDate(d: string | null) {
  return d ? formatDateNumericIST(d) : '—'
}

function fmtTime(d: string | null) {
  return d ? formatTimeIST(d) : null
}

function CapacityBar({ confirmed, capacity }: { confirmed: number; capacity: number | null }) {
  if (!capacity) return <span className='text-white/30 text-xs tabular-nums font-mono'>{confirmed} registered</span>
  const pct = Math.min(100, Math.round((confirmed / capacity) * 100))
  const color = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-stride-yellow-accent' : 'bg-green-500'
  return (
    <div className='flex items-center gap-2'>
      <div className='w-16 bg-white/10 rounded-full h-1.5 overflow-hidden'>
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className='text-white/50 text-xs tabular-nums font-mono'>{confirmed}/{capacity}</span>
    </div>
  )
}

export function RegistrationsClient({ runners, events, totalConfirmed }: Props) {
  const [tab, setTab] = useState<Tab>('runners')
  const [search, setSearch] = useState('')
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  /** '' = no package filter. Only applies to the By event tab. */
  const [packageFilter, setPackageFilter] = useState('')

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

  // Every package name across every event, for the filter dropdown. Empty when
  // no event uses packages, in which case the control is hidden entirely.
  const allPackageNames = useMemo(
    () => [...new Set(events.flatMap(e => e.package_names))].sort(),
    [events]
  )

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events
      .filter(e => !q || e.name.toLowerCase().includes(q))
      // Filtering by package narrows the ATTENDEE list too, not just which events
      // show — otherwise expanding a match would still list everyone.
      .map(e => packageFilter
        ? { ...e, attendees: e.attendees.filter(a => a.packages.some(p => p.name === packageFilter)) }
        : e
      )
      .filter(e => !packageFilter || e.attendees.length > 0)
  }, [events, search, packageFilter])

  return (
    <div>
      {/* Tab bar + search */}
      <div className='flex flex-col sm:flex-row gap-3 mb-6'>
        <div className='flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0'>
          <button
            onClick={() => setTab('runners')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === 'runners' ? 'bg-stride-yellow-accent text-copy-black shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            All runners
            <span className='ml-1.5 text-xs opacity-60'>({runners.length})</span>
          </button>
          <button
            onClick={() => setTab('events')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === 'events' ? 'bg-stride-yellow-accent text-copy-black shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            By event
            <span className='ml-1.5 text-xs opacity-60'>({events.length})</span>
          </button>
        </div>

        <div className='relative flex-1'>
          <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
          <input
            type='text'
            placeholder={tab === 'runners' ? 'Search name, email, tag…' : 'Search event name…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='w-full bg-white/8 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
          />
        </div>

        {/* Package filter — only meaningful on the By event tab, and only shown
            when at least one event actually uses packages. */}
        {tab === 'events' && allPackageNames.length > 0 && (
          <div className='relative shrink-0'>
            <label htmlFor='package-filter' className='sr-only'>Filter by package</label>
            <select
              id='package-filter'
              value={packageFilter}
              onChange={e => setPackageFilter(e.target.value)}
              className='w-full sm:w-auto appearance-none bg-white/8 border border-white/20 rounded-xl pl-4 pr-9 py-2.5 text-white text-sm cursor-pointer focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
            >
              <option value='' className='bg-stride-purple-primary'>All packages</option>
              {allPackageNames.map(name => (
                <option key={name} value={name} className='bg-stride-purple-primary'>{name}</option>
              ))}
            </select>
            <ChevronDown size={15} className='absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
          </div>
        )}
      </div>

      {/* ── Tab A: All Runners — card list ── */}
      {tab === 'runners' && (
        <>
          {filteredRunners.length === 0 ? (
            <div className='bg-white/5 border border-white/10 rounded-2xl p-12 text-center'>
              <p className='text-white/40 text-sm'>{search ? 'No runners match your search.' : 'No registrations yet.'}</p>
            </div>
          ) : (
            <div className='space-y-2'>
              {filteredRunners.map(r => (
                <div
                  key={r.user_id}
                  className='bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 hover:border-white/20 transition-colors'
                >

                  {/* Top row: tag + name + runs */}
                  <div className='flex items-start gap-3'>
                    {/* Runner info */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        {r.runner_tag
                          ? <RunnerTagBadge tag={r.runner_tag} size='xs' />
                          : <span className='text-white/20 text-xs font-mono'>—</span>}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${ROLE_PILL[r.role] ?? 'bg-white/10 text-white/50'}`}>
                          {r.role}
                        </span>
                      </div>
                      <p className='font-semibold text-sm mt-1 truncate text-white'>
                        {r.full_name ?? '—'}
                      </p>
                      <p className='text-white/40 text-xs truncate'>{r.email}</p>
                      {r.username && <p className='text-white/25 text-xs'>@{r.username}</p>}
                    </div>

                    {/* Stats */}
                    <div className='flex gap-4 shrink-0 text-right'>
                      <div>
                        <p className='text-stride-yellow-accent font-bold text-lg tabular-nums leading-none font-mono'>{r.confirmed_count}</p>
                        <p className='text-white/30 text-[10px] mt-0.5'>confirmed</p>
                      </div>
                      <div>
                        <p className={`font-bold text-lg tabular-nums leading-none font-mono ${r.checked_in_count > 0 ? 'text-green-400' : 'text-white/20'}`}>
                          {r.checked_in_count}
                        </p>
                        <p className='text-white/30 text-[10px] mt-0.5'>check-ins</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: last event + check-in indicator */}
                  {r.last_event_name && (
                    <div className='flex items-center gap-2 mt-2.5 pt-2.5 border-t border-white/5'>
                      <Clock size={10} className='text-white/25 shrink-0' />
                      <p className='text-white/35 text-xs truncate'>
                        Last: <span className='text-white/55'>{r.last_event_name}</span>
                      </p>
                      {r.last_event_date && (
                        <p className='text-white/25 text-xs shrink-0 ml-auto'>{fmtDate(r.last_event_date)}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab B: By Event ── */}
      {tab === 'events' && (
        <>
          {filteredEvents.length === 0 ? (
            <div className='bg-white/5 border border-white/10 rounded-2xl p-12 text-center'>
              <p className='text-white/40 text-sm'>{search ? 'No events match your search.' : 'No events yet.'}</p>
            </div>
          ) : (
            <div className='space-y-2'>
              {filteredEvents.map(event => {
                const isExpanded = expandedEventId === event.id
                const isPast = event.event_date ? new Date(event.event_date) < new Date() : false

                return (
                  <div key={event.id} className='bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors'>

                    {/* Event header — clickable to expand */}
                    <button
                      onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                      className='w-full text-left'
                    >
                      <div className='flex items-center gap-3 px-4 py-3.5'>

                        {/* Date chip */}
                        <div className='w-11 h-11 shrink-0 rounded-xl bg-white/8 border border-white/10 flex flex-col items-center justify-center leading-none'>
                          {event.event_date ? (
                            <>
                              <span className='text-stride-yellow-accent text-[8px] font-bold font-mono uppercase tracking-widest'>
                                {formatMonthIST(event.event_date)}
                              </span>
                              <span className='text-white font-bold text-sm'>
                                {formatDayIST(event.event_date)}
                              </span>
                            </>
                          ) : <Calendar size={14} className='text-white/30' />}
                        </div>

                        {/* Name + stats */}
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <p className='text-white font-semibold text-sm line-clamp-1'>{event.name}</p>
                            {isPast && (
                              <span className='text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-white/30'>Completed</span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              event.is_free ? 'bg-green-500/15 text-green-400' : 'bg-white/8 text-white/50'
                            }`}>
                              {event.price_label}
                            </span>
                          </div>

                          {/* Stats row */}
                          <div className='flex items-center gap-3 mt-1.5 flex-wrap'>
                            <span className='flex items-center gap-1 text-white/45 text-xs'>
                              <Users size={9} />
                              {event.confirmed_count} confirmed
                            </span>
                            <span className='text-green-400 text-xs flex items-center gap-1'>
                              <CheckCircle size={9} />
                              {event.checked_in_count} checked in
                            </span>
                            <CapacityBar confirmed={event.confirmed_count} capacity={event.capacity} />
                          </div>
                        </div>

                        {/* Actions — stop propagation so clicks don't toggle expand */}
                        <div className='flex items-center gap-1 shrink-0' onClick={e => e.stopPropagation()}>
                          <Link
                            href={`/admin/events/${event.id}/edit`}
                            title='Edit event'
                            className='p-1.5 rounded-lg text-white/25 hover:text-stride-yellow-accent hover:bg-white/5 transition-colors'
                          >
                            <Pencil size={13} />
                          </Link>
                          <a
                            href={`/events/${event.slug}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            title='View public page'
                            className='p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/5 transition-colors'
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>

                        <div className='text-white/30 shrink-0'>
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </div>
                      </div>
                    </button>

                    {/* Expanded attendee list */}
                    {isExpanded && (
                      <div className='border-t border-white/8'>
                        {event.attendees.length === 0 ? (
                          <p className='text-white/30 text-sm px-4 py-5 text-center'>No registrations for this event.</p>
                        ) : (
                          <div className='divide-y divide-white/4'>
                            {event.attendees.map(a => (
                              <div
                                key={a.registration_id}
                                className='flex items-center gap-3 px-4 py-3 hover:bg-white/2'
                              >

                                {/* Tag */}
                                <div className='shrink-0 w-14'>
                                  {a.runner_tag
                                    ? <RunnerTagBadge tag={a.runner_tag} size='xs' />
                                    : <span className='text-white/20 text-xs'>—</span>}
                                </div>

                                {/* Runner info */}
                                <div className='flex-1 min-w-0'>
                                  <p className='font-medium text-sm truncate text-white/80'>
                                    {a.full_name ?? '—'}
                                  </p>
                                  <p className='text-white/30 text-xs truncate'>{a.email}</p>
                                  {a.packages.length > 0 && (
                                    <p className='text-stride-yellow-accent/70 text-xs mt-1 line-clamp-1'>
                                      {a.packages.map(p => p.name).join(' + ')}
                                      {a.amount_due_paise != null && (
                                        <span className='text-white/30'> · {priceOf(a.amount_due_paise)}</span>
                                      )}
                                    </p>
                                  )}
                                </div>

                                {/* Status + check-in */}
                                <div className='shrink-0 text-right'>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_PILL[a.status] ?? 'bg-white/10 text-white/50'}`}>
                                    {a.status}
                                  </span>
                                  {a.checked_in_at ? (
                                    <p className='text-green-400 text-xs mt-1 flex items-center justify-end gap-1'>
                                      <CheckCircle size={9} />
                                      {fmtTime(a.checked_in_at)}
                                    </p>
                                  ) : (
                                    <p className='text-white/20 text-xs mt-1'>{fmtDate(a.registered_at)}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
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
