'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MONTH_KEY_PATTERN } from '@/lib/utils/month-grid'
import { isCanonicalDistance, OTHER_DISTANCE_KEY } from '@/types/race'

export type RaceView = 'list' | 'month'
export type RaceWindow = 'month' | '3m' | 'all'

export type RaceCalendarState = {
  view: RaceView
  /** Canonical distance keys and/or OTHER_DISTANCE_KEY. Empty = no filter. */
  distances: string[]
  city: string | null
  when: RaceWindow
  /** 'YYYY-MM' the month grid shows. */
  month: string
}

const VIEWS: readonly RaceView[] = ['list', 'month']
const WINDOWS: readonly RaceWindow[] = ['month', '3m', 'all']

const DEFAULT_VIEW: RaceView = 'list'
const DEFAULT_WINDOW: RaceWindow = 'all'

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

/**
 * The calendar's filter and view state, kept in the URL so a filtered view is
 * shareable and survives reload. Every value is parsed against an allowlist;
 * anything unrecognised falls back to the default rather than erroring.
 * Defaults are dropped from the URL so `/race-calendar` stays canonical.
 */
export function useRaceCalendarParams(defaultMonth: string, cities: readonly string[]) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const state = useMemo<RaceCalendarState>(() => {
    const distances = (searchParams.get('d') ?? '')
      .split(',')
      .map(d => d.trim().toUpperCase())
      .filter(d => isCanonicalDistance(d) || d === OTHER_DISTANCE_KEY)
    const cityParam = searchParams.get('city')
    const monthParam = searchParams.get('m')
    return {
      view: pick(searchParams.get('view'), VIEWS, DEFAULT_VIEW),
      distances: [...new Set(distances)],
      city: cityParam && cities.includes(cityParam) ? cityParam : null,
      when: pick(searchParams.get('when'), WINDOWS, DEFAULT_WINDOW),
      month: monthParam && MONTH_KEY_PATTERN.test(monthParam) ? monthParam : defaultMonth,
    }
  }, [searchParams, cities, defaultMonth])

  const set = useCallback((patch: Partial<RaceCalendarState>) => {
    const next = { ...state, ...patch }
    const qs = new URLSearchParams()
    if (next.view !== DEFAULT_VIEW) qs.set('view', next.view)
    if (next.distances.length > 0) qs.set('d', next.distances.map(d => d.toLowerCase()).join(','))
    if (next.city) qs.set('city', next.city)
    if (next.when !== DEFAULT_WINDOW) qs.set('when', next.when)
    if (next.month !== defaultMonth) qs.set('m', next.month)
    const query = qs.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [state, router, pathname, defaultMonth])

  return { state, set }
}
