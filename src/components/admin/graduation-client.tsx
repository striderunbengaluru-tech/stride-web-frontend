'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Search, ChevronDown, ChevronUp, Download, Loader2, Copy, ArrowRight, X, Calendar,
} from 'lucide-react'
import { Avatar } from '@/components/admin/user-facts'
import { RunnerTagBadge } from '@/components/ui/runner-tag-badge'
import { TierBadge } from '@/components/ui/tier-badge'
import {
  MILESTONE_TIERS, getMilestone, getNextMilestone, runsToNextMilestone,
} from '@/lib/milestones'
import type { MilestoneTier } from '@/lib/milestones'
import { formatDayMonthIST, formatTimeIST } from '@/lib/utils/ist'
import { toCsv, downloadCsv, safeFilenamePart, csvTimestamp } from '@/lib/utils/csv'

export type GraduationRunner = {
  user_id: string
  full_name: string | null
  username: string | null
  email: string | null
  runner_tag: string | null
  avatar_url: string | null
  contact_number: string | null
  runs_completed: number
}

/** A runner's projected run count either side of the run that promotes them. */
export type GraduatingRunner = GraduationRunner & {
  runs_before: number
  runs_after: number
}

export type EventGraduations = {
  event_id: string
  name: string
  slug: string
  event_date: string | null
  runners: GraduatingRunner[]
}

type Props = {
  events: EventGraduations[]
  runners: GraduationRunner[]
}

type Tab = 'events' | 'close'

/**
 * How near the next tier a runner has to be to show on the proximity tab. Three
 * is the default because it's roughly a month of running for a regular member —
 * enough notice to order a certificate or a kit.
 */
const PROXIMITY_OPTIONS = [1, 2, 3, 5, 10] as const
const DEFAULT_PROXIMITY = 3

/** Nobody graduates *into* Duckling — it's where everyone starts. */
const TARGET_TIERS = MILESTONE_TIERS.slice(1)

const CSV_HEADERS = [
  'Name', 'Username', 'Runner tag', 'Email', 'Phone',
  'Current runs', 'Current tier', 'Runs to next', 'Next tier',
  'Event', 'Event date',
] as const

function matchesQuery(runner: GraduationRunner, query: string): boolean {
  if (!query) return true
  return Boolean(
    runner.full_name?.toLowerCase().includes(query) ||
    runner.username?.toLowerCase().includes(query) ||
    runner.email?.toLowerCase().includes(query) ||
    runner.runner_tag?.toLowerCase().includes(query)
  )
}

/** "Sat, 24 Aug · 6:00 AM", or a plain dash when the event has no date yet. */
function eventWhen(date: string | null): string {
  if (!date) return 'Date TBC'
  return `${formatDayMonthIST(date)} · ${formatTimeIST(date)}`
}

function csvRow(
  runner: GraduationRunner,
  current: MilestoneTier,
  next: MilestoneTier | null,
  runsToNext: number | null,
  event: { name: string; event_date: string | null } | null,
) {
  return [
    runner.full_name,
    runner.username,
    runner.runner_tag,
    runner.email,
    runner.contact_number,
    runner.runs_completed,
    current.label,
    runsToNext,
    next?.label ?? null,
    event?.name ?? null,
    event?.event_date ? eventWhen(event.event_date) : null,
  ]
}

/** `Name (#TAG)` lines, ready to paste into the crew's WhatsApp thread. */
async function copyRunnerTags(runners: GraduationRunner[]) {
  if (runners.length === 0) {
    toast.error('Nothing to copy — no runners in this list.')
    return
  }

  const text = runners
    .map(r => {
      const name = r.full_name?.trim() || r.username || 'Unnamed runner'
      return r.runner_tag ? `${name} (#${r.runner_tag})` : name
    })
    .join('\n')

  try {
    await navigator.clipboard.writeText(text)
    toast.success(`Copied ${runners.length} runner${runners.length === 1 ? '' : 's'}`)
  } catch {
    toast.error('Could not copy — your browser blocked clipboard access.')
  }
}

/** Trigger + popover listbox for picking the tier runners are graduating INTO. */
function TargetTierPicker({
  value,
  counts,
  onChange,
}: {
  value: string | null
  counts: Record<string, number>
  onChange: (key: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = TARGET_TIERS.find(t => t.key === value) ?? null

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  return (
    <div className='relative shrink-0 flex items-center gap-1' ref={ref}>
      <button
        type='button'
        onClick={() => setOpen(o => !o)}
        aria-haspopup='listbox'
        aria-expanded={open}
        className='inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-white/8 border border-white/20 text-white text-sm hover:border-white/35 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
      >
        {selected ? <TierBadge tier={selected} size='xs' /> : null}
        <span className='line-clamp-1'>{selected ? selected.label : 'All tiers'}</span>
        <ChevronDown size={15} className={`text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {selected && (
        <button
          type='button'
          onClick={() => onChange(null)}
          aria-label='Clear tier filter'
          className='p-2 min-h-11 rounded-xl text-white/35 hover:text-white hover:bg-white/8 transition-colors'
        >
          <X size={15} />
        </button>
      )}

      {open && (
        <ul
          role='listbox'
          aria-label='Tier being graduated into'
          className='absolute left-0 sm:right-0 sm:left-auto top-full mt-1 z-30 w-64 max-h-80 overflow-y-auto rounded-xl bg-stride-purple-primary border border-white/15 shadow-2xl py-1'
        >
          {TARGET_TIERS.map(tier => (
            <li key={tier.key}>
              <button
                type='button'
                role='option'
                aria-selected={value === tier.key}
                onClick={() => { onChange(tier.key); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm min-h-11 transition-colors ${
                  value === tier.key ? 'bg-stride-yellow-accent/8 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <TierBadge tier={tier} size='sm' />
                <span className='line-clamp-1 flex-1'>{tier.label}</span>
                <span className='text-white/35 text-xs tabular-nums'>{counts[tier.key] ?? 0}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** One person's promotion: where they are now and what they're about to become. */
function TierJump({ from, to }: { from: MilestoneTier; to: MilestoneTier }) {
  return (
    <div className='flex items-center gap-1.5 shrink-0'>
      <TierBadge tier={from} size='sm' className='opacity-50' />
      <ArrowRight size={12} className='text-white/25' aria-hidden='true' />
      <TierBadge tier={to} size='sm' />
      <span className='hidden md:line-clamp-1 text-white/60 text-xs font-medium'>{to.label}</span>
    </div>
  )
}

function RunnerIdentity({ runner }: { runner: GraduationRunner }) {
  return (
    <div className='flex-1 min-w-0'>
      <div className='flex items-center gap-1.5 flex-wrap'>
        <p className='font-medium text-sm text-white/85 line-clamp-1'>{runner.full_name ?? '—'}</p>
        {runner.runner_tag && <RunnerTagBadge tag={runner.runner_tag} size='xs' />}
      </div>
      <p className='text-white/30 text-xs truncate'>
        {runner.username ? `@${runner.username}` : runner.email ?? '—'}
      </p>
    </div>
  )
}

export function GraduationClient({ events, runners }: Props) {
  const [tab, setTab] = useState<Tab>('events')
  const [search, setSearch] = useState('')
  const [targetTier, setTargetTier] = useState<string | null>(null)
  const [proximity, setProximity] = useState<number>(DEFAULT_PROXIMITY)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(events[0]?.event_id ?? null)
  const [exportingKey, setExportingKey] = useState<string | null>(null)

  const query = search.trim().toLowerCase()

  // ── Tab A: graduations attached to an upcoming run ────────────────────────
  const filteredEvents = useMemo(() => {
    return events
      .map(event => ({
        ...event,
        runners: event.runners.filter(r =>
          (!targetTier || getMilestone(r.runs_after).key === targetTier) &&
          // The event name counts as a match too, so typing a run's name shows
          // its whole graduating list rather than nothing.
          (matchesQuery(r, query) || event.name.toLowerCase().includes(query))
        ),
      }))
      .filter(event => event.runners.length > 0)
  }, [events, query, targetTier])

  // ── Tab B: everyone within N runs of the next tier ─────────────────────────
  const closeRunners = useMemo(() => {
    return runners
      .map(runner => {
        const current = getMilestone(runner.runs_completed)
        const next = getNextMilestone(runner.runs_completed)
        const toNext = runsToNextMilestone(runner.runs_completed)
        return { runner, current, next, toNext }
      })
      // Legends have nothing above them; they're counted separately below so
      // they aren't silently missing from the screen.
      .filter(r => r.next !== null && r.toNext !== null && r.toNext <= proximity)
      .filter(r => !targetTier || r.next!.key === targetTier)
      .filter(r => matchesQuery(r.runner, query))
      .sort((a, b) => (a.toNext! - b.toNext!) || (b.runner.runs_completed - a.runner.runs_completed))
  }, [runners, query, targetTier, proximity])

  const legendCount = useMemo(
    () => runners.filter(r => getNextMilestone(r.runs_completed) === null).length,
    [runners]
  )

  // Counts for the tier picker, always for the tab being looked at — otherwise
  // the dropdown promises rows the list can't show.
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (tab === 'events') {
      for (const event of events) {
        for (const r of event.runners) {
          const key = getMilestone(r.runs_after).key
          counts[key] = (counts[key] ?? 0) + 1
        }
      }
    } else {
      for (const runner of runners) {
        const next = getNextMilestone(runner.runs_completed)
        const toNext = runsToNextMilestone(runner.runs_completed)
        if (!next || toNext === null || toNext > proximity) continue
        counts[next.key] = (counts[next.key] ?? 0) + 1
      }
    }
    return counts
  }, [tab, events, runners, proximity])

  /** Every graduation across every upcoming run — the headline stat strip. */
  const totalUpcoming = useMemo(
    () => events.reduce((sum, e) => sum + e.runners.length, 0),
    [events]
  )

  async function exportRows(
    key: string,
    filename: string,
    rows: (string | number | null)[][],
  ) {
    if (rows.length === 0) {
      toast.error('Nothing to export — this list is empty.')
      return
    }
    setExportingKey(key)
    try {
      // Yield once so the spinner paints before the main thread encodes a Blob.
      await new Promise(resolve => setTimeout(resolve, 0))
      downloadCsv(filename, toCsv(CSV_HEADERS, rows))
      toast.success(`Downloaded ${rows.length} runner${rows.length === 1 ? '' : 's'}`, { description: filename })
    } catch {
      toast.error('Could not generate the CSV. Please try again.')
    } finally {
      setExportingKey(null)
    }
  }

  function exportEvent(event: EventGraduations) {
    const rows = event.runners.map(r =>
      csvRow(r, getMilestone(r.runs_before), getMilestone(r.runs_after), 1, event)
    )
    exportRows(
      event.event_id,
      `Graduating - ${safeFilenamePart(event.name)} - as of ${csvTimestamp()}.csv`,
      rows,
    )
  }

  function exportClose() {
    const rows = closeRunners.map(({ runner, current, next, toNext }) =>
      csvRow(runner, current, next, toNext, null)
    )
    exportRows(
      'close',
      `Close to next tier - within ${proximity} runs - as of ${csvTimestamp()}.csv`,
      rows,
    )
  }

  return (
    <div>
      {/* Stat strip — how many promotions each tier is about to receive across
          every upcoming run. Zero-count tiers are kept so the ladder reads in
          order and an empty tier is visibly empty, not missing. */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6'>
        {TARGET_TIERS.map(tier => {
          const count = events.reduce(
            (sum, e) => sum + e.runners.filter(r => getMilestone(r.runs_after).key === tier.key).length,
            0
          )
          return (
            <div key={tier.key} className='bg-white/5 border border-white/10 rounded-2xl p-4'>
              <div className='flex items-center gap-2'>
                <TierBadge tier={tier} size='sm' />
                <p className='text-white/40 text-xs line-clamp-1'>Entering {tier.label}</p>
              </div>
              <p className='text-2xl font-bold text-stride-yellow-accent tabular-nums mt-1'>{count}</p>
            </div>
          )
        })}
      </div>

      {/* Tabs + filters */}
      <div className='flex flex-col sm:flex-row gap-3 mb-6'>
        <div className='flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0'>
          <button
            onClick={() => setTab('events')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === 'events' ? 'bg-stride-yellow-accent text-copy-black shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            By upcoming run
            <span className='ml-1.5 text-xs opacity-60'>({totalUpcoming})</span>
          </button>
          <button
            onClick={() => setTab('close')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === 'close' ? 'bg-stride-yellow-accent text-copy-black shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            Close to next tier
            <span className='ml-1.5 text-xs opacity-60'>({closeRunners.length})</span>
          </button>
        </div>

        <div className='relative flex-1'>
          <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
          <label htmlFor='graduation-search' className='sr-only'>Search runners</label>
          <input
            id='graduation-search'
            type='text'
            placeholder={tab === 'events' ? 'Search runner, tag, or run name…' : 'Search name, tag, email…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='w-full bg-white/8 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
          />
        </div>

        <TargetTierPicker value={targetTier} counts={tierCounts} onChange={setTargetTier} />

        {tab === 'close' && (
          <div className='relative shrink-0'>
            <label htmlFor='proximity-filter' className='sr-only'>How many runs from the next tier</label>
            <select
              id='proximity-filter'
              value={proximity}
              onChange={e => setProximity(Number(e.target.value))}
              className='w-full sm:w-auto appearance-none bg-white/8 border border-white/20 rounded-xl pl-4 pr-9 py-2.5 text-white text-sm cursor-pointer focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
            >
              {PROXIMITY_OPTIONS.map(n => (
                <option key={n} value={n} className='bg-stride-purple-primary'>
                  Within {n} run{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className='absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
          </div>
        )}
      </div>

      {/* ── Tab A: By upcoming run ── */}
      {tab === 'events' && (
        filteredEvents.length === 0 ? (
          <div className='bg-white/5 border border-white/10 rounded-2xl p-12 text-center'>
            <p className='text-white/40 text-sm'>
              {query || targetTier
                ? 'No graduations match these filters.'
                : 'Nobody graduates at the upcoming runs yet.'}
            </p>
          </div>
        ) : (
          <div className='space-y-2'>
            {filteredEvents.map(event => {
              const isExpanded = expandedEventId === event.event_id
              return (
                <div key={event.event_id} className='bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors'>
                  <button
                    onClick={() => setExpandedEventId(isExpanded ? null : event.event_id)}
                    className='w-full text-left'
                    aria-expanded={isExpanded}
                  >
                    <div className='flex items-center gap-3 px-4 py-3.5'>
                      <Calendar size={16} className='text-white/25 shrink-0' aria-hidden='true' />
                      <div className='flex-1 min-w-0'>
                        <p className='text-white font-semibold text-sm line-clamp-1'>{event.name}</p>
                        <p className='text-white/40 text-xs mt-0.5'>{eventWhen(event.event_date)}</p>
                      </div>
                      <span className='shrink-0 text-xs font-bold px-2 py-1 rounded-md bg-stride-yellow-accent/15 text-stride-yellow-accent tabular-nums'>
                        {event.runners.length} graduating
                      </span>
                      <div className='text-white/30 shrink-0'>
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className='border-t border-white/8'>
                      <div className='flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/2'>
                        <p className='text-white/35 text-xs mr-auto'>
                          {event.runners.length} runner{event.runners.length === 1 ? '' : 's'} shown
                        </p>
                        <button
                          type='button'
                          onClick={() => copyRunnerTags(event.runners)}
                          className='inline-flex items-center gap-2 min-h-11 px-3.5 rounded-md bg-white/8 border border-white/20 text-white/75 text-xs font-semibold hover:bg-white/12 hover:text-white transition-colors'
                        >
                          <Copy size={14} aria-hidden='true' />
                          Copy tags
                        </button>
                        <button
                          type='button'
                          onClick={() => exportEvent(event)}
                          disabled={exportingKey === event.event_id}
                          className='inline-flex items-center gap-2 min-h-11 px-3.5 rounded-md bg-stride-yellow-accent text-copy-black text-xs font-semibold hover:bg-stride-yellow-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                        >
                          {exportingKey === event.event_id
                            ? <Loader2 size={14} className='animate-spin' aria-hidden='true' />
                            : <Download size={14} aria-hidden='true' />}
                          {exportingKey === event.event_id ? 'Preparing…' : 'Download CSV'}
                        </button>
                      </div>

                      <div className='divide-y divide-white/4'>
                        {event.runners.map(r => (
                          <div key={r.user_id} className='flex items-center gap-3 px-4 py-3 hover:bg-white/2'>
                            <Avatar url={r.avatar_url} name={r.full_name} size='sm' />
                            <RunnerIdentity runner={r} />
                            <p className='shrink-0 text-white/50 text-xs font-mono tabular-nums'>
                              {r.runs_before} <span className='text-white/25'>→</span>{' '}
                              <span className='text-white font-bold'>{r.runs_after}</span>
                            </p>
                            <TierJump from={getMilestone(r.runs_before)} to={getMilestone(r.runs_after)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Tab B: Close to next tier ── */}
      {tab === 'close' && (
        <>
          <div className='flex flex-wrap items-center gap-2 mb-3'>
            <p className='text-white/35 text-xs mr-auto'>
              {closeRunners.length} runner{closeRunners.length === 1 ? '' : 's'} within {proximity} run
              {proximity === 1 ? '' : 's'} of the next tier
            </p>
            <button
              type='button'
              onClick={() => copyRunnerTags(closeRunners.map(r => r.runner))}
              className='inline-flex items-center gap-2 min-h-11 px-3.5 rounded-md bg-white/8 border border-white/20 text-white/75 text-xs font-semibold hover:bg-white/12 hover:text-white transition-colors'
            >
              <Copy size={14} aria-hidden='true' />
              Copy tags
            </button>
            <button
              type='button'
              onClick={exportClose}
              disabled={exportingKey === 'close'}
              className='inline-flex items-center gap-2 min-h-11 px-3.5 rounded-md bg-stride-yellow-accent text-copy-black text-xs font-semibold hover:bg-stride-yellow-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {exportingKey === 'close'
                ? <Loader2 size={14} className='animate-spin' aria-hidden='true' />
                : <Download size={14} aria-hidden='true' />}
              {exportingKey === 'close' ? 'Preparing…' : 'Download CSV'}
            </button>
          </div>

          {closeRunners.length === 0 ? (
            <div className='bg-white/5 border border-white/10 rounded-2xl p-12 text-center'>
              <p className='text-white/40 text-sm'>No runners are this close to their next tier.</p>
            </div>
          ) : (
            <div className='bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/4 overflow-hidden'>
              {closeRunners.map(({ runner, current, next, toNext }) => {
                // Progress through the current tier's band. The top tier is
                // filtered out above, so `nextAt` is always a number here.
                const span = Math.max(1, current.nextAt! - current.threshold)
                const pct = Math.min(100, Math.round(((runner.runs_completed - current.threshold) / span) * 100))

                return (
                  <div key={runner.user_id} className='flex items-center gap-3 px-4 py-3 hover:bg-white/2'>
                    <Avatar url={runner.avatar_url} name={runner.full_name} size='sm' />
                    <RunnerIdentity runner={runner} />

                    <div className='hidden sm:flex items-center gap-1.5 shrink-0'>
                      <TierBadge tier={current} size='sm' />
                      <span className='hidden md:line-clamp-1 text-white/50 text-xs font-medium'>{current.label}</span>
                    </div>

                    <div className='shrink-0 w-28 sm:w-36'>
                      <div className='flex items-baseline justify-end gap-1'>
                        <span className='text-white font-bold text-sm tabular-nums'>{toNext}</span>
                        <span className='text-white/40 text-xs'>to go</span>
                      </div>
                      <div className='h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden'>
                        <div
                          className='h-full rounded-full bg-stride-yellow-accent'
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className='text-white/30 text-[10px] mt-1 text-right line-clamp-1'>
                        {runner.runs_completed} runs → {next!.label}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {legendCount > 0 && (
            <p className='text-white/25 text-xs mt-4'>
              {legendCount} Stride Legend{legendCount === 1 ? ' is' : 's are'} not listed — there is no tier above.
            </p>
          )}
        </>
      )}
    </div>
  )
}
