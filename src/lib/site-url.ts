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

/** Origins that must never appear in a response served off a real deployment. */
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']

function isLocalOrigin(value: string): boolean {
  try {
    return LOCAL_HOSTS.includes(new URL(value).hostname)
  } catch {
    // Not a parseable URL — treat it as unusable rather than as a valid origin.
    return true
  }
}

/**
 * `NEXT_PUBLIC_SITE_URL`, with a guard against a mis-set dashboard value.
 *
 * Production once had this variable set to `http://localhost:3000`, and because
 * the markdown representation of every page builds absolute links from it, the
 * live site spent that time telling AI agents that Stride's events page was on
 * their own machine. The fallback was already correct; the variable was not.
 *
 * So: on a Vercel deployment a localhost value is treated as absent. Locally
 * (`process.env.VERCEL` unset) it is honoured, because that is where localhost
 * is the right answer.
 */
export function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (!configured) return PRODUCTION_SITE_URL
  if (process.env.VERCEL === '1' && isLocalOrigin(configured)) return PRODUCTION_SITE_URL
  return configured.replace(/\/+$/, '')
}

/**
 * The origin this particular request arrived on.
 *
 * Preferred over `resolveSiteUrl()` inside route handlers: it needs no
 * environment variable to be right, so a preview deployment emits preview links
 * and production emits production ones without anyone configuring anything.
 * Falls back to the env-derived value when the headers are missing.
 */
export function getRequestOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!host) return resolveSiteUrl()

  const proto = request.headers.get('x-forwarded-proto')
    ?? (LOCAL_HOSTS.some(h => host.startsWith(h)) ? 'http' : 'https')

  return `${proto}://${host}`
}
