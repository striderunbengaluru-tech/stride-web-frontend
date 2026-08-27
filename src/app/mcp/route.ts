import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'
import { getRequestOrigin } from '@/lib/site-url'
import {
  isSandbox,
  listEvents,
  getEvent,
  getLeaderboard,
  getMilestoneTiers,
  getClubInfo,
} from '@/lib/mcp/data'
import { EVENT_CARD_URI, EVENT_CARD_HTML, LEADERBOARD_URI, LEADERBOARD_HTML } from '@/lib/mcp/ui'
import { MCP_SERVER_VERSION, PRODUCT_SERVER } from '@/lib/mcp/registry'
import { serveMcp, unauthorized, jsonResult, notFoundResult } from '@/lib/mcp/serve'
import { serverCard } from '@/lib/mcp/discovery'

/**
 * Stride's product MCP server — read-only access to public event, pricing,
 * leaderboard and milestone data, plus two MCP Apps views.
 *
 * Mounted at `/mcp` rather than `/api/mcp` on purpose: `robots.txt` disallows
 * `/api/`, and an MCP endpoint that agents are meant to discover cannot live
 * behind a Disallow.
 *
 * Every tool reads through @/lib/mcp/data, which reads through the same cached,
 * column-scoped helpers the pages use. Nothing here touches `adminClient`
 * directly, nothing writes, and no tool can return a field the website does not
 * already show to anyone. Those are the properties that make an unauthenticated
 * public surface safe rather than merely convenient.
 */

// Node, not Edge: the SDK's server implementation and the event reads both use
// Node APIs, and the tool handlers hit Supabase through the shared helpers.
export const runtime = 'nodejs'

// Tool responses reflect live event data. The reads underneath are already
// tagged-cached; this stops a CDN adding a second, untagged layer on top.
export const dynamic = 'force-dynamic'

function buildServer(origin: string, sandbox: boolean): McpServer {
  const server = new McpServer(
    { name: PRODUCT_SERVER.name, version: MCP_SERVER_VERSION },
    {
      instructions:
        'Stride Run Club is a running community in Bengaluru, India. Use list_events and get_event for what is happening and what it costs, show_event when the user should see one event, get_leaderboard for standings, get_milestone_tiers for how membership tiers work, and get_club_info for facts about the club. Everything here is read-only: registration, payment and check-in are done by the person in a browser and cannot be performed through this server. Prices are in Indian rupees; dates are ISO 8601 UTC and Stride displays them in IST.',
    },
  )

  /** Site-relative paths become absolute before they leave the server. */
  const withUrl = <T extends { url: string | null }>(item: T): T & { absoluteUrl: string | null } => ({
    ...item,
    absoluteUrl: item.url ? `${origin}${item.url}` : null,
  })

  server.registerTool(
    'list_events',
    {
      title: PRODUCT_SERVER.tools[0].title,
      description: PRODUCT_SERVER.tools[0].description,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        when: z.enum(['upcoming', 'past', 'all']).optional()
          .describe('Which events to return. Defaults to upcoming.'),
        maxPricePaise: z.number().int().min(0).optional()
          .describe('Only events at or below this price, in integer paise. 0 returns free events only.'),
        maxDistanceKm: z.number().min(0).optional()
          .describe('Only events at or below this distance in kilometres.'),
        difficulty: z.string().optional()
          .describe('Match an event difficulty label, e.g. "Beginner".'),
        limit: z.number().int().min(1).max(100).optional()
          .describe('Maximum events to return. Defaults to 25.'),
      },
    },
    async args => {
      const { events, total } = await listEvents(args, sandbox)
      return jsonResult({
        events: events.map(withUrl),
        returned: events.length,
        totalMatching: total,
        sandbox,
      })
    },
  )

  server.registerTool(
    'get_event',
    {
      title: PRODUCT_SERVER.tools[1].title,
      description: PRODUCT_SERVER.tools[1].description,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        slug: z.string().min(1)
          .describe('The event slug, as returned by list_events — e.g. "stride-labs".'),
      },
    },
    async ({ slug }) => {
      const event = await getEvent(slug, sandbox)
      if (!event) {
        return notFoundResult(
          `No published Stride event with slug "${slug}". Call list_events to see what exists.`,
        )
      }
      return jsonResult({ event: withUrl(event), sandbox })
    },
  )

  registerAppTool(
    server,
    'show_event',
    {
      title: PRODUCT_SERVER.tools[2].title,
      description: PRODUCT_SERVER.tools[2].description,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        slug: z.string().min(1).describe('The event slug to display.'),
      },
      _meta: { ui: { resourceUri: EVENT_CARD_URI } },
    },
    async ({ slug }) => {
      const event = await getEvent(slug, sandbox)
      if (!event) {
        return notFoundResult(
          `No published Stride event with slug "${slug}". Call list_events to see what exists.`,
        )
      }
      return jsonResult({ event: withUrl(event), sandbox })
    },
  )

  server.registerTool(
    'get_leaderboard',
    {
      title: PRODUCT_SERVER.tools[3].title,
      description: PRODUCT_SERVER.tools[3].description,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional()
          .describe('How many athletes to return. Defaults to 10.'),
      },
    },
    async ({ limit }) => {
      const board = await getLeaderboard(limit, sandbox)
      return jsonResult({
        athletes: board.athletes.map(withUrl),
        totalAthletes: board.totalAthletes,
        ranking: 'Most community runs attended. Ties broken by who reached the count first.',
        privacyNote: 'Athletes who keep their profile private are listed with a name and count only — no username, no link.',
        sandbox,
      })
    },
  )

  registerAppTool(
    server,
    'show_leaderboard',
    {
      title: PRODUCT_SERVER.tools[4].title,
      description: PRODUCT_SERVER.tools[4].description,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional()
          .describe('How many athletes to display. Defaults to 10.'),
      },
      _meta: { ui: { resourceUri: LEADERBOARD_URI } },
    },
    async ({ limit }) => {
      const board = await getLeaderboard(limit, sandbox)
      return jsonResult({
        athletes: board.athletes.map(withUrl),
        totalAthletes: board.totalAthletes,
        sandbox,
      })
    },
  )

  server.registerTool(
    'get_milestone_tiers',
    {
      title: PRODUCT_SERVER.tools[5].title,
      description: PRODUCT_SERVER.tools[5].description,
      annotations: { readOnlyHint: true },
    },
    async () => jsonResult({
      tiers: getMilestoneTiers(),
      earnedBy: 'Attending runs and checking in with a four-character Stride Tag. Tiers cannot be bought.',
      moreAt: `${origin}/milestones`,
    }),
  )

  server.registerTool(
    'get_club_info',
    {
      title: PRODUCT_SERVER.tools[6].title,
      description: PRODUCT_SERVER.tools[6].description,
      annotations: { readOnlyHint: true },
    },
    async () => {
      const info = getClubInfo()
      return jsonResult({
        ...info,
        links: Object.fromEntries(
          Object.entries(info.links).map(([key, value]) => [
            key,
            value.startsWith('/') ? `${origin}${value}` : value,
          ]),
        ),
      })
    },
  )

  registerAppResource(
    server,
    'Stride event card',
    EVENT_CARD_URI,
    { description: 'Interactive card for one Stride event — date, venue, distance, price, packages and a link to register.' },
    async () => ({
      contents: [{ uri: EVENT_CARD_URI, mimeType: RESOURCE_MIME_TYPE, text: EVENT_CARD_HTML }],
    }),
  )

  registerAppResource(
    server,
    'Stride leaderboard',
    LEADERBOARD_URI,
    { description: 'The Stride leaderboard as a ranked, interactive list.' },
    async () => ({
      contents: [{ uri: LEADERBOARD_URI, mimeType: RESOURCE_MIME_TYPE, text: LEADERBOARD_HTML }],
    }),
  )

  return server
}

async function handle(request: Request): Promise<Response> {
  const origin = getRequestOrigin(request)

  // Nothing here accepts a credential, so a request carrying one has been
  // misconfigured. Say so, with the RFC 9728 pointer that explains why.
  if (request.headers.get('authorization')) return unauthorized(origin)

  const sandbox = isSandbox(new URL(request.url))
  return serveMcp(request, () => buildServer(origin, sandbox))
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
