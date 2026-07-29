/**
 * The canonical public origin, hard-coded on purpose.
 *
 * Use it for anything durable that leaves the app — calendar entries and
 * transactional emails. Those outlive the deployment that created them, so they
 * must not carry a per-environment origin: a run added to Google Calendar from a
 * local build embedded `http://localhost:3000` links that can never resolve
 * again, and a registration made on staging would email
 * `staging.strideclub.in` links to a real member.
 *
 * Anything describing the *current* deployment keeps using
 * `NEXT_PUBLIC_SITE_URL`: canonical tags, og:url, the sitemap, and the Strava
 * OAuth redirect (which has to match the origin the request came from).
 */
export const PRODUCTION_SITE_URL = 'https://www.strideclub.in'
