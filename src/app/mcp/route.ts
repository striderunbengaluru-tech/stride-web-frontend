import { getRequestOrigin } from '@/lib/site-url'
import { isSandbox } from '@/lib/mcp/data'
import { buildProductServer } from '@/lib/mcp/product-server'
import { serveMcp, unauthorized } from '@/lib/mcp/serve'
import { serverCard } from '@/lib/mcp/discovery'
import { checkRateLimit, tooManyRequests, rateLimitHeaders, READ_LIMIT } from '@/lib/rate-limit'

/**
 * Stride's product MCP server — read-only access to public event, pricing,
 * leaderboard and milestone data, plus two MCP Apps views.
 *
 * Mounted at `/mcp` rather than `/api/mcp` on purpose: `robots.txt` disallows
 * `/api/`, and an MCP endpoint that agents are meant to discover cannot live
 * behind a Disallow. The same server also answers POST at `/.well-known/mcp`,
 * for clients that handshake against wherever they found the manifest.
 *
 * The tools themselves are in @/lib/mcp/product-server. Every one reads through
 * @/lib/mcp/data, which reads through the same cached, column-scoped helpers the
 * pages use. Nothing here touches `adminClient` directly, nothing writes, and no
 * tool can return a field the website does not already show to anyone.
 */

// Node, not Edge: the SDK's server implementation and the event reads both use
// Node APIs, and the tool handlers hit Supabase through the shared helpers.
export const runtime = 'nodejs'

// Tool responses reflect live event data. The reads underneath are already
// tagged-cached; this stops a CDN adding a second, untagged layer on top.
export const dynamic = 'force-dynamic'

async function handle(request: Request): Promise<Response> {
  const origin = getRequestOrigin(request)

  // Best-effort, per-instance — see @/lib/rate-limit for why that is the honest
  // description. Checked before anything reads the database.
  const limit = checkRateLimit(request, READ_LIMIT)
  if (!limit.ok) return tooManyRequests(limit, `${origin}/auth.md`)

  // Nothing here accepts a credential, so a request carrying one has been
  // misconfigured. Say so, with the RFC 9728 pointer that explains why.
  if (request.headers.get('authorization')) return unauthorized(origin)

  const sandbox = isSandbox(new URL(request.url))
  return serveMcp(request, () => buildProductServer(origin, sandbox), rateLimitHeaders(limit))
}

/**
 * The server card, for anything that fetched this URL without speaking MCP.
 *
 * The transport requires `Accept: application/json, text/event-stream` and
 * answers anything else with `406` and a protocol error — correct by the spec,
 * and useless to the agent, crawler or person who found this URL in the API
 * catalog and simply opened it. They get the card instead, which is the same
 * document `/.well-known/mcp/server-card.json` serves and tells them how to
 * call the endpoint properly.
 *
 * Real MCP clients always send both media types, so this never intercepts one.
 */
function isMcpClient(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('text/event-stream')
}

function card(request: Request): Response {
  return Response.json(serverCard(getRequestOrigin(request)), {
    headers: {
      'Allow': 'GET, POST, DELETE, OPTIONS',
      'Vary': 'Accept',
      'Cache-Control': 'public, max-age=0, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function GET(request: Request): Promise<Response> {
  return isMcpClient(request) ? handle(request) : card(request)
}

export const POST = handle
export const DELETE = handle

export async function OPTIONS(request: Request): Promise<Response> {
  return card(request)
}
