import { istDayKey, istMonthKey } from '@/lib/utils/ist'
import type { RaceRow } from '@/types/race'

/**
 * The race as the public calendar's client components receive it: projected
 * field by field (never a row spread), with the IST day and month keys already
 * computed so no client ever buckets a UTC instant by its own timezone.
 */
export type RaceCardData = {
  id: string
  name: string
  slug: string
  /** UTC ISO instant. Date-only races are 00:00 IST. */
  raceDate: string
  hasStartTime: boolean
  /** 'YYYY-MM-DD' IST — the calendar cell this race belongs to. */
  dayKey: string
  /** 'YYYY-MM' IST. */
  monthKey: string
  city: string
  venue: string | null
  organizer: string | null
  distances: string[]
  posterUrl: string | null
  registrationUrl: string | null
  couponCode: string | null
  registrationDeadline: string | null
}

export function toRaceCardData(row: RaceRow): RaceCardData {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    raceDate: row.race_date,
    hasStartTime: row.has_start_time,
    dayKey: istDayKey(row.race_date),
    monthKey: istMonthKey(row.race_date),
    city: row.city,
    venue: row.venue,
    organizer: row.organizer,
    distances: row.distances ?? [],
    posterUrl: row.poster_images?.[0] ?? null,
    registrationUrl: row.registration_url,
    couponCode: row.coupon_code,
    registrationDeadline: row.registration_deadline,
  }
}

/**
 * Whether the Register link and coupon should still be shown. Both instants are
 * passed in rather than read from the clock so the same answer is computed on
 * the server at render time and on the client, and so components stay pure.
 * ISO strings compare lexically.
 */
export function isRegistrationOpen(
  race: { dayKey: string; registrationDeadline: string | null },
  todayKey: string,
  nowIso: string,
): boolean {
  if (race.dayKey < todayKey) return false
  if (race.registrationDeadline && race.registrationDeadline <= nowIso) return false
  return true
}

/** Distinct cities, alphabetical — the options for the city filter. */
export function distinctCities(races: readonly { city: string }[]): string[] {
  return [...new Set(races.map(r => r.city.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}
