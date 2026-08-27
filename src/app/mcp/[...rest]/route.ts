import { getRequestOrigin } from '@/lib/site-url'
import { notFoundProblem } from '@/lib/api-errors'
import { guardRate, READ_LIMIT } from '@/lib/rate-limit'

/**
 * JSON 404 for unmatched paths under `/mcp`.
 *
 * Without this the request falls through to the app's HTML not-found page, and
 * an agent probing the API gets a React document instead of a parseable error.
 * A catch-all route only runs when nothing more specific matched, so no real
 * endpoint is shadowed.
 */

export const dynamic = 'force-dynamic'

const AVAILABLE = [
  '/mcp',
  '/mcp/docs',
]

function handler(request: Request): Response {
  const origin = getRequestOrigin(request)
  const rate = guardRate(request, READ_LIMIT, `${origin}/developers`)
  if (rate.limited) return rate.limited
  return notFoundProblem(origin, new URL(request.url).pathname, AVAILABLE, rate.headers)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
export const HEAD = handler
