import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'
import {
  listEvents,
  getEvent,
  listRaces,
  getRace,
  getLeaderboard,
  getMilestoneTiers,
  getClubInfo,
} from '@/lib/mcp/data'
import { RACE_DISTANCE_KEYS, OTHER_DISTANCE_KEY } from '@/types/race'
import { MONTH_KEY_PATTERN } from '@/lib/utils/month-grid'
import { EVENT_CARD_URI, EVENT_CARD_HTML, LEADERBOARD_URI, LEADERBOARD_HTML } from '@/lib/mcp/ui'
import { MCP_SERVER_VERSION, PRODUCT_SERVER } from '@/lib/mcp/registry'
import { jsonResult, notFoundResult } from '@/lib/mcp/serve'

/**
 * Builds the product MCP server.
 *
 * Lives here rather than in the route so that `/mcp` and `/.well-known/mcp` can
 * both serve it. They are the same server at two URLs — a second copy of these
 * tool definitions is exactly the kind of thing that drifts.
 */
export function buildProductServer(origin: string, sandbox: boolean): McpServer {
  const server = new McpServer(
    { name: PRODUCT_SERVER.name, version: MCP_SERVER_VERSION },
    {
      instructions:
        'Stride Run Club is a running community in Bengaluru, India. Use list_events and get_event for what is happening and what it costs, show_event when the user should see one event, list_races and get_race for the calendar of third-party races Stride curates (marathons, half marathons, 10Ks, ultras — organised by others, sometimes with a Stride coupon code), get_leaderboard for standings, get_milestone_tiers for how membership tiers work, and get_club_info for facts about the club. Everything here is read-only: registration, payment and check-in are done by the person in a browser and cannot be performed through this server. Prices are in Indian rupees; dates are ISO 8601 UTC and Stride displays them in IST.',
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

  // Race tools sit at indices 7 and 8 of PRODUCT_TOOLS — appended there, never
  // inserted, precisely because every lookup above is by position.
  const distanceKeys = [...RACE_DISTANCE_KEYS, OTHER_DISTANCE_KEY].map(k => k.toLowerCase()) as [string, ...string[]]

  server.registerTool(
    'list_races',
    {
      title: PRODUCT_SERVER.tools[7].title,
      description: PRODUCT_SERVER.tools[7].description,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        when: z.enum(['upcoming', 'past', 'all']).optional()
          .describe('Which races to return. Defaults to upcoming.'),
        distance: z.enum(distanceKeys).optional()
          .describe('Only races offering this distance category. "other" matches custom distances such as 15K.'),
        city: z.string().optional()
          .describe('Only races in this city, matched case-insensitively against the listed city.'),
        month: z.string().regex(MONTH_KEY_PATTERN).optional()
          .describe('Only races in this IST calendar month, as "YYYY-MM".'),
        limit: z.number().int().min(1).max(100).optional()
          .describe('Maximum races to return. Defaults to 25.'),
      },
    },
    async args => {
      const { races, total } = await listRaces(args, sandbox)
      return jsonResult({
        races: races.map(withUrl),
        returned: races.length,
        totalMatching: total,
        note: 'Third-party races curated by Stride. Registration and payment happen on the organiser\'s site; a couponCode, where present, is for the person to use there.',
        sandbox,
      })
    },
  )

  server.registerTool(
    'get_race',
    {
      title: PRODUCT_SERVER.tools[8].title,
      description: PRODUCT_SERVER.tools[8].description,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        slug: z.string().min(1)
          .describe('The race slug, as returned by list_races.'),
      },
    },
    async ({ slug }) => {
      const race = await getRace(slug, sandbox)
      if (!race) {
        return notFoundResult(
          `No published race with slug "${slug}" on the Stride race calendar. Call list_races to see what exists.`,
        )
      }
      return jsonResult({ race: withUrl(race), sandbox })
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
