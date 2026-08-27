import { getRequestOrigin } from '@/lib/site-url'
import { notFoundProblem } from '@/lib/api-errors'

/**
 * JSON 404 for unmatched paths under `/.well-known`.
 *
 * Without this the request falls through to the app's HTML not-found page, and
 * an agent probing the API gets a React document instead of a parseable error.
 * A catch-all route only runs when nothing more specific matched, so no real
 * endpoint is shadowed.
  *
  * Static children (`mcp`, `ard.json`, …) take precedence over this
  * catch-all, so it only answers well-known paths Stride does not publish.
 */

export const dynamic = 'force-dynamic'

const AVAILABLE = [
  '/.well-known/mcp',
  '/.well-known/mcp/server-card.json',
  '/.well-known/agent-card.json',
  '/.well-known/agent-skills/index.json',
  '/.well-known/ard.json',
  '/.well-known/ai-catalog.json',
  '/.well-known/api-catalog',
  '/.well-known/oauth-protected-resource',
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
