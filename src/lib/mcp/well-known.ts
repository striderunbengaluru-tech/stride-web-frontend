import { getRequestOrigin } from '@/lib/site-url'
import { guardRate, READ_LIMIT } from '@/lib/rate-limit'

/**
 * Shared response shape for the `.well-known` documents.
 *
 * Each of them is a route handler rather than a static file in `public/` for one
 * reason: every URI inside them has to be absolute and has to point at the
 * origin the request arrived on. A static file would hardcode production, and a
 * preview deployment would then advertise production endpoints — which is how
 * you end up testing a change against the live site by accident.
 */
export function wellKnownJson(
  request: Request,
  build: (origin: string) => unknown,
  contentType = 'application/json',
): Response {
  const origin = getRequestOrigin(request)

  // Counted and reported like every other endpoint. A discovery document is
  // still a request, and a client that reads ten of them should see its budget
  // move rather than learn the ceiling only once it starts calling tools.
  const rate = guardRate(request, READ_LIMIT, `${origin}/developers`)
  if (rate.limited) return rate.limited

  return new Response(JSON.stringify(build(origin), null, 2), {
    headers: {
      'Content-Type': contentType,
      // Short: a mistake in one of these should be fixable in minutes, not
      // cached for a day at the edge.
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
      // These documents are meant to be read cross-origin by agent tooling
      // running in a browser. They contain nothing but public URLs.
      'Access-Control-Allow-Origin': '*',
      ...rate.headers,
    },
  })
}
