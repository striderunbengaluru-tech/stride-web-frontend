/**
 * Whether one athlete's Strava data (km this year, recent runs) is shown to
 * anyone other than that athlete.
 *
 * Strava's API Agreement §2.3 says Strava data "can only be displayed or
 * disclosed … to that user". The club chose to show it publicly — the km board
 * and profile run cards — and to raise this with Strava in the athlete-limit
 * increase request. If Strava objects, flip this to false: the km board
 * disappears and profile cards become owner-only. Nothing else needs to change.
 */
export const STRAVA_PUBLIC_DISPLAY = true

/** The activity types that count as a run — matches Strava's own ytd_run_totals. */
export const STRAVA_RUN_TYPES: readonly string[] = ['Run', 'TrailRun', 'VirtualRun']

/**
 * Athletes the Strava API app may connect at its current tier — Strava enforces
 * this (403 on token exchange). At the cap the profile's connect prompt is
 * hidden from athletes who aren't connected; the admin Strava tab shows usage
 * against it. Raise this when Strava raises the limit and the prompt returns.
 */
export const STRAVA_ATHLETE_CAP = 10

/** How many recent runs are kept and shown per athlete. */
export const STRAVA_RECENT_RUNS = 5

/**
 * `activity:read` (not `activity:read_all`) on purpose: it excludes "Only You"
 * activities and strips privacy-zone points from routes, so a runner's home
 * never reaches a public map.
 */
export const STRAVA_SCOPE = 'read,activity:read'
