// Age from a date of birth, plus the bounds that decide what counts as a real
// one. Shared by the registration form and the server that validates it, so the
// two can never disagree about who is a minor.

/** Terms of Service floor: under-13s may not use the Services at all. */
export const MIN_REGISTRATION_AGE = 13
/** Anything past this is a typo, not a runner. */
export const MAX_REGISTRATION_AGE = 110
/** Guardian consent (DPDP s.9) is required below this. */
export const ADULT_AGE = 18

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Whole years old today, or null when `dob` isn't a complete YYYY-MM-DD date.
 * Compared component-wise rather than by subtracting timestamps, so it doesn't
 * shift by a day depending on the runtime's timezone.
 */
export function ageFromDob(dob: string | null | undefined, now: Date = new Date()): number | null {
  if (!dob || !DOB_PATTERN.test(dob)) return null
  const [year, month, day] = dob.split('-').map(Number)
  if (!year || !month || !day) return null

  let age = now.getFullYear() - year
  const beforeBirthday =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)
  if (beforeBirthday) age--
  return age
}

/**
 * True when the date of birth is one a person could actually have. The native
 * date picker opens on the current year, so a half-finished entry lands a few
 * months ago and computes to age 0 — which used to read as "minor" and put the
 * guardian-consent checkbox in front of adults who had never really set a DOB.
 */
export function isPlausibleDob(dob: string | null | undefined, now: Date = new Date()): boolean {
  const age = ageFromDob(dob, now)
  return age !== null && age >= MIN_REGISTRATION_AGE && age <= MAX_REGISTRATION_AGE
}

/** A real DOB that belongs to someone under 18 — the only case needing consent. */
export function requiresGuardianConsent(dob: string | null | undefined, now: Date = new Date()): boolean {
  const age = ageFromDob(dob, now)
  return age !== null && isPlausibleDob(dob, now) && age < ADULT_AGE
}

/** Validation message for a date-of-birth field, or null when it's fine. */
export function dobError(dob: string): string | null {
  if (!DOB_PATTERN.test(dob)) return 'Please enter your date of birth'
  const age = ageFromDob(dob)
  if (age === null) return 'Please enter your date of birth'
  if (age < 0) return 'Date of birth cannot be in the future'
  if (age < MIN_REGISTRATION_AGE) return `Please check your date of birth — you must be at least ${MIN_REGISTRATION_AGE} to register`
  if (age > MAX_REGISTRATION_AGE) return 'Please check your date of birth'
  return null
}
