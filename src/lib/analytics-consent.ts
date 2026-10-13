// The visitor's analytics choice — one store shared by GoogleAnalytics, the
// CookieNotice "Opt out of analytics" button and the footer toggle, so all three
// agree the moment any one of them changes it.
//
// OPT-OUT MODEL. Analytics runs by default and a visitor can switch it off. This
// is a deliberate product decision and a KNOWN DEVIATION from legal advice,
// which recommended prior (opt-in) consent before any non-essential cookie is
// set. If that advice is adopted later, flip the default here — absence of the
// cookie would then mean "off" — and nothing else needs to learn a new rule.
//
// The choice lives in a 1-year first-party cookie rather than localStorage so it
// is readable by the same mechanism as the cookie-notice acknowledgement, and so
// a server could honour it later without a client round trip. It only records
// a choice the visitor asked us to remember, so it is itself strictly necessary.
//
// Client-only: every function touches `document`. Server rendering reads the
// choice through useSyncExternalStore's server snapshot instead (see callers).

const OPTOUT_COOKIE = 'stride_analytics_optout'
const OPTOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const listeners = new Set<() => void>()

// In-memory override so a choice made this session sticks even when cookies
// can't be written (some private modes) — it just won't survive a reload.
let sessionChoice: boolean | null = null

/** Re-reads on cross-tab changes too, the same way CookieNotice does. */
export function subscribeAnalyticsChoice(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

/** True when the visitor has opted out of analytics. */
export function isAnalyticsOptedOut(): boolean {
  if (sessionChoice !== null) return sessionChoice
  try {
    return document.cookie.split('; ').includes(`${OPTOUT_COOKIE}=1`)
  } catch {
    // Cookies unreadable — nothing recorded, so the default (analytics on) holds.
    return false
  }
}

function notify() {
  listeners.forEach(listener => listener())
}

/** Records an opt-out. GoogleAnalytics stops reporting as soon as it hears. */
export function optOutOfAnalytics(): void {
  sessionChoice = true
  try {
    document.cookie = `${OPTOUT_COOKIE}=1; max-age=${OPTOUT_COOKIE_MAX_AGE}; path=/; samesite=lax`
  } catch {
    // Best-effort persistence — the in-memory choice still applies this session.
  }
  notify()
}

/** Withdraws an opt-out, returning analytics to the default (on). */
export function clearAnalyticsOptOut(): void {
  sessionChoice = false
  try {
    document.cookie = `${OPTOUT_COOKIE}=; max-age=0; path=/; samesite=lax`
  } catch {
    // Best-effort, as above.
  }
  notify()
}
