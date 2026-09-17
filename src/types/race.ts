/**
 * Races are third-party events (Bengaluru 10K, TMM, …) that admins curate for
 * the public race calendar. They are not Stride events: no registrations,
 * payments, capacity or check-in — only a signpost to the organiser's page and,
 * where Stride has one, a coupon code.
 */

export const RACE_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
} as const

export type RaceStatus = (typeof RACE_STATUS)[keyof typeof RACE_STATUS]

/**
 * The canonical distance categories an admin can tick. `km` exists only to sort
 * chips and to answer "at or below N km" — it is a label's nominal length, not a
 * stored measurement, so the "store distances in metres" rule does not apply.
 * Ultras have no single length, hence null.
 */
export const RACE_DISTANCES = {
  '3K':  { label: '3K',            km: 3 },
  '5K':  { label: '5K',            km: 5 },
  '10K': { label: '10K',           km: 10 },
  HALF:  { label: 'Half marathon', km: 21.0975 },
  FULL:  { label: 'Marathon',      km: 42.195 },
  ULTRA: { label: 'Ultra',         km: null },
} as const

export type RaceDistance = keyof typeof RACE_DISTANCES

export const RACE_DISTANCE_KEYS = Object.keys(RACE_DISTANCES) as RaceDistance[]

/** The filter chip that collects every custom distance ("15K", "25K", …). */
export const OTHER_DISTANCE_KEY = 'OTHER'

export const MAX_RACE_DISTANCES = 10
export const MAX_CUSTOM_DISTANCE_LENGTH = 20
export const MAX_RACE_POSTERS = 5
export const MAX_RACE_COUPON_LENGTH = 40

export function isCanonicalDistance(value: string): value is RaceDistance {
  return value in RACE_DISTANCES
}

/** Trim, collapse inner whitespace and upper-case — so "15k" and "15K" are one value. */
export function normaliseDistance(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase()
}

/** What a runner reads on a chip: the canonical label, or the custom text as typed. */
export function distanceLabel(value: string): string {
  return isCanonicalDistance(value) ? RACE_DISTANCES[value].label : value
}

/**
 * Nominal kilometres for sorting and "≤ N km" filters. Canonical keys carry
 * their own; a custom like "15K" or "25 KM" is parsed; anything else is null.
 */
export function distanceKm(value: string): number | null {
  if (isCanonicalDistance(value)) return RACE_DISTANCES[value].km
  const match = normaliseDistance(value).match(/^(\d+(?:\.\d+)?)\s*KM?$/)
  if (!match) return null
  const km = Number(match[1])
  return Number.isFinite(km) && km > 0 ? km : null
}

/** Shortest first; unparseable customs last, alphabetically. */
export function sortDistances(values: readonly string[]): string[] {
  return [...values].sort((a, b) => {
    const ka = distanceKm(a)
    const kb = distanceKm(b)
    if (ka !== null && kb !== null) return ka - kb
    if (ka !== null) return -1
    if (kb !== null) return 1
    return a.localeCompare(b)
  })
}

/** Exact shape of a public.races row as supabase-js returns it. */
export type RaceRow = {
  id: string
  name: string
  slug: string
  description: string | null
  poster_images: string[]
  /** UTC instant. When has_start_time is false this is 00:00 IST on race day. */
  race_date: string
  has_start_time: boolean
  city: string
  venue: string | null
  organizer: string | null
  /** Canonical keys (RaceDistance) and/or normalised custom strings. */
  distances: string[]
  registration_url: string | null
  coupon_code: string | null
  registration_deadline: string | null
  status: RaceStatus
  updated_at: string
}
