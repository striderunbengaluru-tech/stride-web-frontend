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
 * Validates a package list against the event's capacity.
 *
 * Returns the FIRST problem so the caller can focus a single field, and null
 * when the allocation is sound. Capacity is required whenever packages are on:
 * "unlimited spots" and "spots must add up to capacity" can't both be true.
 */
export function validatePackageSpots(
  packages: readonly PackageDraft[],
  capacity: number | null | undefined,
  packagesEnabled: boolean,
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

  const allocated = sumPackageSpots(packages)
  if (allocated !== capacity) {
    const diff = Math.abs(allocated - capacity)
    const direction = allocated > capacity ? 'over' : 'short'
    return {
      message: `Package spots add up to ${allocated} but capacity is ${capacity} — ${diff} ${direction}. Adjust them to match.`,
      field: 'packages',
    }
  }

  return null
}

/**
 * Divides capacity across `count` packages as evenly as possible, remainder to
 * the earliest packages. Powers the form's one-click "Split evenly" fix.
 */
export function splitSpotsEvenly(capacity: number, count: number): number[] {
  if (count < 1) return []
  const base = Math.floor(capacity / count)
  const remainder = capacity % count
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0))
}
