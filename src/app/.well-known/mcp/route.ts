import { serverCard } from '@/lib/mcp/discovery'
import { wellKnownJson } from '@/lib/mcp/well-known'
import { buildProductServer } from '@/lib/mcp/product-server'
import { serveMcp, unauthorized } from '@/lib/mcp/serve'
import { isSandbox } from '@/lib/mcp/data'
import { getRequestOrigin } from '@/lib/site-url'
import { checkRateLimit, tooManyRequests, rateLimitHeaders, READ_LIMIT } from '@/lib/rate-limit'

/**
 * `/.well-known/mcp` — both the discovery document and a working endpoint.
 *
 * `GET` returns the server card, which is what the path is for: a client that
 * wants to know what is here before connecting.
 *
 * `POST` speaks the protocol, exactly as `/mcp` does. That is not what the
 * well-known path is nominally for, and it is here because of what clients
 * actually do: a scanner that finds a manifest at this path and then attempts a
 * handshake against the same URL used to get `405 Method Not Allowed` and
 * conclude the server was broken. Answering the handshake wherever the manifest
 * was found costs one thin route and removes a whole class of false negative.
 *
 * `/mcp` remains the canonical `serverUrl` in every card and catalog.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  return wellKnownJson(request, serverCard)
}

export async function POST(request: Request): Promise<Response> {
  const origin = getRequestOrigin(request)

  const limit = checkRateLimit(request, READ_LIMIT)
  if (!limit.ok) return tooManyRequests(limit, `${origin}/auth.md`)

  if (request.headers.get('authorization')) return unauthorized(origin, rateLimitHeaders(limit))

  const sandbox = isSandbox(new URL(request.url))
  return serveMcp(request, () => buildProductServer(origin, sandbox), rateLimitHeaders(limit))
}

export const DELETE = POST

export function OPTIONS(request: Request): Response {
  return wellKnownJson(request, serverCard)
}
