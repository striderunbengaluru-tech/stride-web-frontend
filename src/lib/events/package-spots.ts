import { sumPackageSpots, type EventPackage } from '@/types/event'

/**
 * The package-allocation rule, in one place so the admin form, the Zod schema
 * and the server action all reject the same thing with the same wording.
 *
 * Deliberately free of `sonner` and of any server-only import so both sides can
 * use it. The return shape is structurally a `FieldError` from
 * `@/lib/utils/form-errors`, without importing it.
 */
export type SpotsProblem = { message: string; field: string } | null

type PackageDraft = Pick<EventPackage, 'name' | 'spotsTotal'>

/**
 * One registration that holds a spot, as the package ids it bought. Empty when
 * it bought none (registered while packages were off). Ids only — no runner data
 * — so the list is safe to hand to the admin form.
 */
export type SpotHold = readonly string[]

/** The registration columns `collectSpotHolds` needs. */
export type SpotHoldRow = {
  status: string | null
  created_at: string | null
  selected_packages: string | null
}

// Mirrors register_for_event: CONFIRMED, plus checkout holds younger than the
// 15-minute window. The admin form and the registration guard must agree.
const PENDING_HOLD_MS = 15 * 60 * 1000

/** Turns registration rows into the spots they hold, dropping ones that hold none. */
export function collectSpotHolds(rows: readonly SpotHoldRow[], now = Date.now()): SpotHold[] {
  const cutoff = now - PENDING_HOLD_MS
  const holds: SpotHold[] = []

  for (const row of rows) {
    const holdsSpot = row.status === 'CONFIRMED'
      || (row.status === 'PENDING' && new Date(row.created_at ?? 0).getTime() > cutoff)
    if (!holdsSpot) continue

    let ids: string[] = []
    try {
      const parsed: unknown = JSON.parse(row.selected_packages ?? '[]')
      if (Array.isArray(parsed)) {
        ids = parsed
          .map(pkg => (pkg as { id?: unknown })?.id)
          .filter((id): id is string => typeof id === 'string')
      }
    } catch { /* malformed snapshot: still a spot against capacity */ }

    holds.push(ids)
  }

  return holds
}

/**
 * Spots already used up by registrations that no current package accounts for —
 * typically a sold package the admin has since deleted. Those runners still
 * count against `events.capacity` in register_for_event, so the remaining
 * packages may only share out what is left.
 *
 * A registration that also bought a surviving package (multi-select) is that
 * package's spot, not a retired one, so it is not counted here.
 */
export function countRetiredSpots(
  holds: readonly SpotHold[],
  packages: readonly Pick<EventPackage, 'id'>[],
): number {
  const current = new Set(packages.map(pkg => pkg.id))
  return holds.filter(ids => !ids.some(id => current.has(id))).length
}

/** What the current packages must add up to: capacity minus retired spots. */
export function allocatableSpots(capacity: number, retiredSpots: number): number {
  return Math.max(capacity - retiredSpots, 0)
}

/**
 * Validates a package list against the event's capacity.
 *
 * Returns the FIRST problem so the caller can focus a single field, and null
 * when the allocation is sound. Capacity is required whenever packages are on:
 * "unlimited spots" and "spots must add up to capacity" can't both be true.
 *
 * `retiredSpots` (see countRetiredSpots) is taken off capacity first: the
 * packages must add up to what is still allocatable, not to the whole event.
 */
export function validatePackageSpots(
  packages: readonly PackageDraft[],
  capacity: number | null | undefined,
  packagesEnabled: boolean,
  retiredSpots = 0,
): SpotsProblem {
  if (!packagesEnabled) return null

  if (packages.length === 0) {
    return { message: 'Add at least one package, or turn Event packages off.', field: 'packages' }
  }

  if (packages.some(pkg => !pkg.name.trim())) {
    return { message: 'Give every package a name.', field: 'packages' }
  }

  if (!capacity || capacity < 1) {
    return {
      message: 'Set the event capacity first — package spots have to add up to it.',
      field: 'capacity',
    }
  }

  const missing = packages.find(pkg => !pkg.spotsTotal || pkg.spotsTotal < 1)
  if (missing) {
    return {
      message: `"${missing.name.trim()}" needs a spot count of at least 1.`,
      field: 'packages',
    }
  }

  const target = allocatableSpots(capacity, retiredSpots)
  if (target < 1) {
    return {
      message: `Removed packages already hold all ${capacity} spots. Raise capacity to sell more.`,
      field: 'capacity',
    }
  }

  const allocated = sumPackageSpots(packages)
  if (allocated !== target) {
    const diff = Math.abs(allocated - target)
    const direction = allocated > target ? 'over' : 'short'
    const targetLabel = retiredSpots > 0
      ? `${target} spots are left to allocate (capacity ${capacity} − ${retiredSpots} held by removed packages)`
      : `capacity is ${capacity}`
    return {
      message: `Package spots add up to ${allocated} but ${targetLabel} — ${diff} ${direction}. Adjust them to match.`,
      field: 'packages',
    }
  }

  return null
}

/**
 * Divides `spots` across `count` packages as evenly as possible, remainder to
 * the earliest packages. Powers the form's one-click "Split evenly" fix, which
 * passes allocatableSpots, not raw capacity.
 */
export function splitSpotsEvenly(spots: number, count: number): number[] {
  if (count < 1) return []
  const base = Math.floor(spots / count)
  const remainder = spots % count
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0))
}
