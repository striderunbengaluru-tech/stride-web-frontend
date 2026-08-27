import { getRequestOrigin } from '@/lib/site-url'
import { notFoundProblem } from '@/lib/api-errors'

/**
 * JSON 404 for unmatched paths under `/api`.
 *
 * Without this the request falls through to the app's HTML not-found page, and
 * an agent probing the API gets a React document instead of a parseable error.
 * A catch-all route only runs when nothing more specific matched, so no real
 * endpoint is shadowed.
  *
  * Stride has no public REST API under /api — every route there is
  * authenticated and internal, and robots.txt disallows the prefix. This
  * exists so that an agent probing for one is told that in JSON, with the
  * endpoints that do exist, instead of being handed the HTML 404 page.
 */

export const dynamic = 'force-dynamic'

const AVAILABLE = [
  '/mcp',
  '/mcp/docs',
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
