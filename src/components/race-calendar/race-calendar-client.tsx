'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWebMcpTools } from '@/hooks/use-web-mcp-tools'
import { toolJson, toolError } from '@/lib/webmcp'
import { groupByDay, shiftMonth } from '@/lib/utils/month-grid'
import type { RaceCardData } from '@/lib/races/present'
import { isCanonicalDistance, OTHER_DISTANCE_KEY } from '@/types/race'
import { useRaceCalendarParams, type RaceWindow } from './use-race-calendar-params'
import { ViewToggle } from './view-toggle'
import { RaceFilters } from './race-filters'
import { RaceList } from './race-list'
import { MonthGrid } from './month-grid'

type Props = {
  /** Every published race, soonest first, with IST day keys already computed. */
  races: RaceCardData[]
  cities: string[]
  todayKey: string
  nowIso: string
}

/** Months the "Next 3 months" window spans beyond the current one. */
const THREE_MONTH_SPAN = 2

function matchesDistances(race: RaceCardData, selected: string[]): boolean {
  if (selected.length === 0) return true
  return selected.some(key =>
    key === OTHER_DISTANCE_KEY
      ? race.distances.some(d => !isCanonicalDistance(d))
      : race.distances.includes(key),
  )
}

export function RaceCalendarClient({ races, cities, todayKey, nowIso }: Props) {
  const router = useRouter()
  const todayMonth = todayKey.slice(0, 7)
  // The grid opens on the month of the next race, not on an empty current month.
  const defaultMonth = races.find(r => r.dayKey >= todayKey)?.monthKey ?? todayMonth
  const { state, set } = useRaceCalendarParams(defaultMonth, cities)

  const hasOther = useMemo(() => races.some(r => r.distances.some(d => !isCanonicalDistance(d))), [races])

  const filtered = useMemo(
    () => races.filter(r => matchesDistances(r, state.distances) && (!state.city || r.city === state.city)),
    [races, state.distances, state.city],
  )

  const { upcoming, past } = useMemo(() => {
    const windowEnd = state.when === 'month'
      ? todayMonth
      : state.when === '3m' ? shiftMonth(todayMonth, THREE_MONTH_SPAN) : null
    const upcoming = filtered.filter(r => r.dayKey >= todayKey && (!windowEnd || r.monthKey <= windowEnd))
    const past = filtered.filter(r => r.dayKey < todayKey).reverse()
    return { upcoming, past }
  }, [filtered, state.when, todayKey, todayMonth])

  const racesByDay = useMemo(() => groupByDay(filtered), [filtered])

  // Month navigation is clamped to where there is something to see.
  const { minMonth, maxMonth } = useMemo(() => {
    const months = filtered.map(r => r.monthKey)
    return {
      minMonth: months.reduce((min, m) => (m < min ? m : min), todayMonth),
      maxMonth: months.reduce((max, m) => (m > max ? m : max), todayMonth),
    }
  }, [filtered, todayMonth])

  const filtersActive = state.distances.length > 0 || state.city !== null || state.when !== 'all'

  function toggleDistance(key: string) {
    set({ distances: state.distances.includes(key) ? state.distances.filter(d => d !== key) : [...state.distances, key] })
  }

  // WebMCP: a browser agent drives the same state the chips drive, so the page
  // visibly changes and the person can see what it did. Read-only, no session.
  useWebMcpTools([
    {
      name: 'search_races',
      description:
        'Filter the third-party races on this page by distance, city and date window, and switch the view. Returns the matching races with date, city, distances, registration link and any Stride coupon code.',
      inputSchema: {
        type: 'object',
        properties: {
          distance: { type: 'string', description: 'One of 3k, 5k, 10k, half, full, ultra, other.' },
          city: { type: 'string', description: 'A city exactly as listed on the page.' },
          when: { type: 'string', enum: ['month', '3m', 'all'], description: 'Date window for the list. Defaults to all upcoming.' },
          view: { type: 'string', enum: ['list', 'month'] },
        },
      },
      execute: (args) => {
        const distance = typeof args.distance === 'string' ? args.distance.toUpperCase() : null
        const patch: Parameters<typeof set>[0] = {}
        if (distance && (isCanonicalDistance(distance) || distance === OTHER_DISTANCE_KEY)) patch.distances = [distance]
        if (typeof args.city === 'string' && cities.includes(args.city)) patch.city = args.city
        if (args.when === 'month' || args.when === '3m' || args.when === 'all') patch.when = args.when as RaceWindow
        if (args.view === 'list' || args.view === 'month') patch.view = args.view
        set(patch)

        const scoped = races.filter(r =>
          matchesDistances(r, patch.distances ?? state.distances) &&
          (!(patch.city ?? state.city) || r.city === (patch.city ?? state.city)) &&
          r.dayKey >= todayKey,
        )
        return toolJson({
          matched: scoped.length,
          races: scoped.map(r => ({
            name: r.name, slug: r.slug, date: r.raceDate, dateOnly: !r.hasStartTime, city: r.city, venue: r.venue,
            organizer: r.organizer, distances: r.distances, registrationUrl: r.registrationUrl, couponCode: r.couponCode, discountPercent: r.discountPercent,
            registrationDeadline: r.registrationDeadline, url: `/race-calendar/${r.slug}`,
          })),
        })
      },
    },
    {
      name: 'open_race',
      description: 'Navigate this browser to a race page. Accepts the race slug from search_races, or the race name. Read-only navigation.',
      inputSchema: {
        type: 'object',
        required: ['race'],
        properties: { race: { type: 'string', description: 'The race slug, or its name.' } },
      },
      execute: (args) => {
        const needle = String(args.race ?? '').trim().toLowerCase()
        if (!needle) return toolError('Provide a race slug or name.')
        const match =
          races.find(r => r.slug.toLowerCase() === needle) ??
          races.find(r => r.name.toLowerCase() === needle) ??
          races.find(r => r.name.toLowerCase().includes(needle))
        if (!match) return toolError(`No race on this page matches "${args.race}". Call search_races to see what exists.`)
        router.push(`/race-calendar/${match.slug}`)
        return toolJson({ navigatedTo: `/race-calendar/${match.slug}`, name: match.name })
      },
    },
  ])

  const inMonth = filtered.filter(r => r.monthKey === state.month).length
  const countLabel = state.view === 'list'
    ? `${upcoming.length} upcoming ${upcoming.length === 1 ? 'race' : 'races'}`
    : `${inMonth} ${inMonth === 1 ? 'race' : 'races'} this month`

  return (
    <div className='space-y-8'>
      {/* One toolbar row: view on the left, filters (and what is active) on the right */}
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-y border-white/10 py-4'>
        <div className='flex items-center gap-4'>
          <ViewToggle view={state.view} onChange={view => set({ view })} />
          <p className='text-white/40 text-sm hidden md:block' aria-live='polite'>{countLabel}</p>
        </div>
        <RaceFilters
          selectedDistances={state.distances}
          onToggleDistance={toggleDistance}
          hasOther={hasOther}
          city={state.city}
          cities={cities}
          onCityChange={city => set({ city })}
          when={state.when}
          onWhenChange={when => set({ when })}
          showWindow={state.view === 'list'}
          onClear={() => set({ distances: [], city: null, when: 'all' })}
        />
      </div>
      <p className='text-white/40 text-sm md:hidden -mt-4' aria-live='polite'>{countLabel}</p>

      {state.view === 'list' ? (
        <RaceList upcoming={upcoming} past={past} todayKey={todayKey} nowIso={nowIso} filtersActive={filtersActive} />
      ) : (
        <MonthGrid
          monthKey={state.month}
          racesByDay={racesByDay}
          todayKey={todayKey}
          nowIso={nowIso}
          minMonth={minMonth}
          maxMonth={maxMonth}
          onMonthChange={month => set({ month })}
        />
      )}
    </div>
  )
}
