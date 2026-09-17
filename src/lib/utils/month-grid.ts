/**
 * Pure month-grid arithmetic for the race calendar. React-free and timezone-free
 * on purpose: every input and output is an IST civil date key ('YYYY-MM-DD') or
 * month key ('YYYY-MM'), and the maths runs on Date.UTC so the visitor's own
 * timezone can never shift a day. Callers produce the keys with istDayKey().
 */

const DAYS_PER_WEEK = 7

/** 'YYYY-MM' → [year, monthIndex0]. */
function splitMonthKey(monthKey: string): [number, number] {
  const [y, m] = monthKey.split('-').map(Number)
  return [y, m - 1]
}

/** Shift a month key by `delta` months. Date.UTC normalises overflow across years. */
export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m0] = splitMonthKey(monthKey)
  return new Date(Date.UTC(y, m0 + delta, 1)).toISOString().slice(0, 7)
}

/**
 * Rows of seven day-keys, Monday first, with null for the leading and trailing
 * blanks. A month spans 4, 5 or 6 rows.
 */
export function buildMonthCells(monthKey: string): (string | null)[][] {
  const [y, m0] = splitMonthKey(monthKey)
  const daysInMonth = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate()
  // getUTCDay: Sun=0 … Sat=6. Rotate so Mon=0 … Sun=6.
  const lead = (new Date(Date.UTC(y, m0, 1)).getUTCDay() + 6) % DAYS_PER_WEEK
  const total = Math.ceil((lead + daysInMonth) / DAYS_PER_WEEK) * DAYS_PER_WEEK

  const flat = Array.from({ length: total }, (_, i) => {
    const day = i - lead + 1
    return day >= 1 && day <= daysInMonth
      ? new Date(Date.UTC(y, m0, day)).toISOString().slice(0, 10)
      : null
  })

  const rows: (string | null)[][] = []
  for (let i = 0; i < flat.length; i += DAYS_PER_WEEK) rows.push(flat.slice(i, i + DAYS_PER_WEEK))
  return rows
}

/** Group items by their IST day key, preserving the input order within a day. */
export function groupByDay<T extends { dayKey: string }>(items: readonly T[]): Map<string, T[]> {
  const byDay = new Map<string, T[]>()
  for (const item of items) {
    const list = byDay.get(item.dayKey)
    if (list) list.push(item)
    else byDay.set(item.dayKey, [item])
  }
  return byDay
}

/** "October 2026" for a month key — no instant involved, so no timezone. */
export function monthKeyLabel(monthKey: string): string {
  const [y, m0] = splitMonthKey(monthKey)
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m0, 1)))
}

export const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const MS_PER_DAY = 86_400_000

/** Whole days from `fromKey` to `toKey` (both 'YYYY-MM-DD'). Negative when `toKey` is earlier. */
export function dayKeyDiff(toKey: string, fromKey: string): number {
  return Math.round((Date.parse(toKey) - Date.parse(fromKey)) / MS_PER_DAY)
}
