import { getRequestOrigin } from '@/lib/site-url'
import { notFoundProblem } from '@/lib/api-errors'

/**
 * JSON 404 for unmatched paths under `/ask`.
 *
 * Without this the request falls through to the app's HTML not-found page, and
 * an agent probing the API gets a React document instead of a parseable error.
 * A catch-all route only runs when nothing more specific matched, so no real
 * endpoint is shadowed.
 */

export const dynamic = 'force-dynamic'

const AVAILABLE = [
  '/ask',
]

function handler(request: Request): Response {
  const origin = getRequestOrigin(request)
  return notFoundProblem(origin, new URL(request.url).pathname, AVAILABLE)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
export const HEAD = handler
