import { isChoiceFieldType, type AdditionalField } from '@/types/event'
import type { Attendee } from '@/types/admin-registrations'

// Filtering and sorting for one event's participant list in the admin panel.
// Pure functions over data the page already holds, so the panel, the "select
// all" checkbox and the CSV export all narrow by exactly the same rule.

/** Sentinel filter value: the runner left the field blank. */
export const UNANSWERED = '__unanswered__'
/** Sentinel coupon filter values. */
export const ANY_COUPON = '__any__'
export const NO_COUPON = '__none__'

export type AttendeeFilters = {
  search: string
  status: string
  gender: string
  coupon: string
  checkIn: '' | 'in' | 'out'
  packageName: string
  /** Custom choice question id → the option to match ('' = any). */
  answers: Record<string, string>
}

export const EMPTY_FILTERS: AttendeeFilters = {
  search: '', status: '', gender: '', coupon: '', checkIn: '', packageName: '', answers: {},
}

export type SortKey =
  | 'registered-desc' | 'registered-asc'
  | 'name-asc' | 'name-desc'
  | 'runs-desc' | 'runs-asc'
  | 'age-asc' | 'age-desc'
  | `field:${string}`

export const DEFAULT_SORT: SortKey = 'registered-desc'

/** Normalised coupon code, so "early10" and "EARLY10" are one coupon. */
export function couponKey(code: string | null): string | null {
  const trimmed = code?.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

/** One runner's answer to one question, or null when blank or missing. */
export function answerText(attendee: Attendee, field: AdditionalField): string | null {
  const raw = attendee.custom_responses[field.id]
  if (raw === undefined || raw === null) return null
  const text = String(raw).trim()
  return text.length > 0 ? text : null
}

/** The questions an admin can filter by: the ones with a fixed list of answers. */
export function filterableFields(fields: AdditionalField[]): AdditionalField[] {
  return fields.filter(f => isChoiceFieldType(f.type) && (f.options?.length ?? 0) > 0)
}

export function countActiveFilters(filters: AttendeeFilters): number {
  const base = [filters.status, filters.gender, filters.coupon, filters.checkIn, filters.packageName]
    .filter(Boolean).length
  return base + Object.values(filters.answers).filter(Boolean).length
}

function matchesSearch(a: Attendee, q: string, fields: AdditionalField[]): boolean {
  if (!q) return true
  const haystack = [
    a.full_name, a.email, a.username, a.runner_tag, a.contact_number, a.coupon_code,
    ...fields.map(f => answerText(a, f)),
  ]
  return haystack.some(value => value?.toLowerCase().includes(q))
}

function matchesAnswer(a: Attendee, field: AdditionalField, wanted: string): boolean {
  if (!wanted) return true
  const answer = answerText(a, field)
  return wanted === UNANSWERED ? answer === null : answer === wanted
}

function matchesCoupon(a: Attendee, wanted: string): boolean {
  if (!wanted) return true
  const code = couponKey(a.coupon_code)
  if (wanted === ANY_COUPON) return code !== null
  if (wanted === NO_COUPON) return code === null
  return code === wanted
}

export function filterAttendees(
  attendees: Attendee[],
  filters: AttendeeFilters,
  fields: AdditionalField[],
): Attendee[] {
  const q = filters.search.trim().toLowerCase()
  const byId = new Map(fields.map(f => [f.id, f]))
  return attendees.filter(a =>
    (!filters.status || a.status === filters.status) &&
    (!filters.gender || (filters.gender === UNANSWERED ? !a.gender : a.gender === filters.gender)) &&
    matchesCoupon(a, filters.coupon) &&
    (!filters.checkIn || (filters.checkIn === 'in') === Boolean(a.checked_in_at)) &&
    (!filters.packageName || a.packages.some(p => p.name === filters.packageName)) &&
    Object.entries(filters.answers).every(([id, wanted]) => {
      const field = byId.get(id)
      return !field || matchesAnswer(a, field, wanted)
    }) &&
    matchesSearch(a, q, fields)
  )
}

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

/**
 * Orders answers to one question. Choice questions follow the option order the
 * admin authored (that's the order they think in), number questions sort
 * numerically, text alphabetically. Blank answers always go last.
 */
function compareByField(field: AdditionalField): (a: Attendee, b: Attendee) => number {
  const optionRank = new Map((field.options ?? []).map((o, i) => [o, i]))
  return (a, b) => {
    const x = answerText(a, field)
    const y = answerText(b, field)
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
    if (isChoiceFieldType(field.type)) {
      return (optionRank.get(x) ?? Infinity) - (optionRank.get(y) ?? Infinity) || collator.compare(x, y)
    }
    if (field.type === 'number') {
      const diff = Number(x) - Number(y)
      if (!Number.isNaN(diff) && diff !== 0) return diff
    }
    return collator.compare(x, y)
  }
}

/** Missing values (no name, no age) sort last in either direction. */
function nullsLast<T>(x: T | null, y: T | null, compare: (x: T, y: T) => number): number {
  if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
  return compare(x, y)
}

function comparatorFor(sort: SortKey, fields: AdditionalField[]): (a: Attendee, b: Attendee) => number {
  const byTime = (a: Attendee, b: Attendee) => Date.parse(a.registered_at) - Date.parse(b.registered_at)
  switch (sort) {
    case 'registered-asc': return byTime
    case 'registered-desc': return (a, b) => byTime(b, a)
    case 'name-asc': return (a, b) => nullsLast(a.full_name, b.full_name, collator.compare)
    case 'name-desc': return (a, b) => nullsLast(a.full_name, b.full_name, (x, y) => collator.compare(y, x))
    case 'runs-desc': return (a, b) => b.runs_completed - a.runs_completed
    case 'runs-asc': return (a, b) => a.runs_completed - b.runs_completed
    case 'age-asc': return (a, b) => nullsLast(a.age, b.age, (x, y) => x - y)
    case 'age-desc': return (a, b) => nullsLast(a.age, b.age, (x, y) => y - x)
    default: {
      const field = fields.find(f => `field:${f.id}` === sort)
      return field ? compareByField(field) : (a, b) => byTime(b, a)
    }
  }
}

/** Stable: ties keep newest-registered first, so groups read predictably. */
export function sortAttendees(attendees: Attendee[], sort: SortKey, fields: AdditionalField[]): Attendee[] {
  const primary = comparatorFor(sort, fields)
  const tiebreak = comparatorFor(DEFAULT_SORT, fields)
  return [...attendees].sort((a, b) => primary(a, b) || tiebreak(a, b))
}

/** How many attendees gave each value, for the counts shown beside each option. */
export function countBy<T>(attendees: Attendee[], key: (a: Attendee) => T): Map<T, number> {
  const counts = new Map<T, number>()
  for (const a of attendees) {
    const k = key(a)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}
