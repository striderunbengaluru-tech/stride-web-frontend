// Every date and time this app shows is IST, everywhere — public pages, admin,
// emails, tickets. The club runs in Bengaluru, so a time means the same wall
// clock for every viewer regardless of where they load the page from, and an
// admin travelling abroad sees the same start time as the runners do.
//
// Two rules follow, and all date/time rendering goes through this module so they
// can't drift apart:
//
//  1. Storage is a UTC instant (timestamptz). An admin types a wall clock, so
//     the write path must state which zone that wall clock is in.
//  2. Rendering pins `timeZone: 'Asia/Kolkata'`. Without it the output follows
//     the runtime: UTC on the Vercel server, the visitor's own zone in the
//     browser — so the same event showed two different times.
//
// The bug that prompted this: `new Date('2026-08-02T06:30').toISOString()` in a
// server action reads the string as *server-local* time. On Vercel that's UTC,
// so a 6:30 am IST run was stored as 06:30Z and rendered as 12:00 pm IST.

/** IST is a fixed +05:30 with no DST, so a constant offset is exact. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const IST = 'Asia/Kolkata'

/**
 * `<input type="datetime-local">` value (a wall clock with no zone, which the
 * admin entered as IST) → UTC ISO instant for the DB. Returns null for empty or
 * unparseable input so callers can store NULL.
 */
export function istLocalToUtcIso(local: string | null | undefined): string | null {
  if (!local) return null
  // The input gives 'YYYY-MM-DDTHH:mm', or '…:ss' when a step is set.
  const withSeconds = local.length === 16 ? `${local}:00` : local
  const parsed = new Date(`${withSeconds}+05:30`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

/**
 * Stored UTC instant → 'YYYY-MM-DDTHH:mm' IST wall clock, the only format
 * `<input type="datetime-local">` accepts. Shifting the epoch and slicing the
 * ISO string is exact because IST has no DST.
 */
export function utcIsoToIstLocal(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined
  const ms = new Date(iso).getTime()
  if (Number.isNaN(ms)) return undefined
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 16)
}

/**
 * Whole IST **calendar** days from `from` (default: now) to `value`.
 * Same IST day → 0, next IST day → 1, and so on. Negative for a past day.
 *
 * Elapsed time divided by 24h is NOT the same thing, and using it produced a
 * real bug: at 11 pm IST on 30 Jul, a run at 6:30 am on 1 Aug is ~31 hours away,
 * so `floor(31 / 24)` said "1" and the badge read "Tomorrow" — but in IST
 * calendar terms 31 Jul is tomorrow and 1 Aug is two days out. "Tomorrow" is a
 * property of the date, not of the gap.
 *
 * Shifting the epoch by the fixed IST offset and flooring to whole days yields
 * an IST civil-date index; the difference of two indices is exact because IST
 * has no DST.
 */
export function istCalendarDaysUntil(
  value: string | Date,
  from: string | Date | number = Date.now()
): number {
  const MS_PER_DAY = 86_400_000
  const istDayIndex = (ms: number) => Math.floor((ms + IST_OFFSET_MS) / MS_PER_DAY)

  const target = new Date(value).getTime()
  const origin = typeof from === 'number' ? from : new Date(from).getTime()
  if (Number.isNaN(target) || Number.isNaN(origin)) return NaN

  return istDayIndex(target) - istDayIndex(origin)
}

/** Escape hatch for one-off option sets — always IST, always en-IN. */
export function formatIST(value: string | Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone: IST, ...options }).format(new Date(value))
}

/** "Sat, 2 Aug, 6:30 am" — the one-line label used on cards and banners. */
export function formatDateTimeIST(value: string | Date): string {
  return formatIST(value, {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

/** "Saturday, 2 August 2026" */
export function formatDateLongIST(value: string | Date): string {
  return formatIST(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** "Sat, 2 Aug" */
export function formatDateShortIST(value: string | Date): string {
  return formatIST(value, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** "2 Aug 2026" */
export function formatDateNumericIST(value: string | Date): string {
  return formatIST(value, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "Sat, 2 Aug 2026" */
export function formatDateFullIST(value: string | Date): string {
  return formatIST(value, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/** "2 Aug" */
export function formatDayMonthIST(value: string | Date): string {
  return formatIST(value, { day: 'numeric', month: 'short' })
}

/** "August 2026" — profile "joined" lines. */
export function formatMonthYearIST(value: string | Date): string {
  return formatIST(value, { month: 'long', year: 'numeric' })
}

/** "06:30 am" */
export function formatTimeIST(value: string | Date): string {
  return formatIST(value, { hour: '2-digit', minute: '2-digit' })
}

/** "AUG" — the month strip on date badges. */
export function formatMonthIST(value: string | Date): string {
  return formatIST(value, { month: 'short' }).toUpperCase()
}

/** "2" — the day numeral on date badges. */
export function formatDayIST(value: string | Date): string {
  return formatIST(value, { day: 'numeric' })
}
