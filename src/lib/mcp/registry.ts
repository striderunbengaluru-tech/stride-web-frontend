import { EVENT_CARD_URI, LEADERBOARD_URI } from './ui'

/**
 * What the MCP servers expose, described once.
 *
 * Six documents advertise these tools — `/.well-known/mcp/server-card.json`,
 * `/.well-known/agent-card.json`, `/.well-known/agent-skills/index.json`,
 * `/.well-known/ard.json`, `/.well-known/ai-catalog.json` and `/?mode=agent` —
 * and every one of them reads this file. Hand-maintaining six lists is how a
 * server card ends up promising a tool that was renamed a month ago.
 *
 * The names here are the contract. The zod input schemas live next to the
 * handlers in the route files, because those are the only place they are used;
 * `inputSummary` below is the human-readable version for the cards, which
 * cannot carry zod.
 */

export type ToolDescriptor = {
  name: string
  title: string
  description: string
  /** Plain-English parameter list for the discovery documents. */
  inputSummary: string
  /** Set when the tool renders an MCP Apps view. */
  uiResourceUri?: string
  /** Every tool here is read-only. Stated, not assumed. */
  readOnly: true
}

export const PRODUCT_TOOLS: ToolDescriptor[] = [
  {
    name: 'list_events',
    title: 'List Stride events',
    description:
      'List Stride Run Club events in Bengaluru — upcoming by default, or past. Filter by maximum price, maximum distance, or difficulty. Returns name, slug, date, venue, price and registration URL for each. Only published events are returned.',
    inputSummary: 'when ("upcoming" | "past" | "all"), maxPricePaise, maxDistanceKm, difficulty, limit',
    readOnly: true,
  },
  {
    name: 'get_event',
    title: 'Get one Stride event',
    description:
      'Full detail for one Stride event by slug: date, venue, distance, difficulty, price, pricing packages, post-run location, terms, and remaining spots where the event publishes availability.',
    inputSummary: 'slug (required)',
    readOnly: true,
  },
  {
    name: 'show_event',
    title: 'Show a Stride event card',
    description:
      'Render an interactive card for one Stride event, showing its date, venue, distance, price and pricing packages with a link to register. Use this instead of get_event when the answer is about a single event and the user would benefit from seeing it.',
    inputSummary: 'slug (required)',
    uiResourceUri: EVENT_CARD_URI,
    readOnly: true,
  },
  {
    name: 'get_leaderboard',
    title: 'Get the Stride leaderboard',
    description:
      'The Stride athletes with the most community runs attended, ranked. Returns display name, run count and milestone tier. Athletes who keep their profile private appear with a name and count only.',
    inputSummary: 'limit (1-50, default 10)',
    readOnly: true,
  },
  {
    name: 'show_leaderboard',
    title: 'Show the Stride leaderboard',
    description:
      'Render the Stride leaderboard as an interactive ranked list. Use this instead of get_leaderboard when the user asked to see the standings.',
    inputSummary: 'limit (1-50, default 10)',
    uiResourceUri: LEADERBOARD_URI,
    readOnly: true,
  },
  {
    name: 'get_milestone_tiers',
    title: 'Get the Stride milestone tiers',
    description:
      'The five Stride membership tiers — Duckling, Strider, Stride Athlete, Stride Pro Athlete, Stride Legend — with the number of runs each requires and the perks it unlocks. Tiers are earned by attending runs and cannot be bought.',
    inputSummary: 'no parameters',
    readOnly: true,
  },
  {
    name: 'get_club_info',
    title: 'Get Stride club info',
    description:
      'Facts about Stride Run Club: what it is, where it runs, how many runs a week, membership cost (free), 2025 participation numbers, how to join, and links to every public page and social profile.',
    inputSummary: 'no parameters',
    readOnly: true,
  },
]

export const DOCS_TOOLS: ToolDescriptor[] = [
  {
    name: 'search_docs',
    title: 'Search Stride documentation',
    description:
      "Keyword search across everything Stride publishes: blog posts, FAQ answers, the Lead Striders, and every public page. Returns ranked results with a title, summary and path. Use this first when a question is about what Stride says rather than about a specific event.",
    inputSummary: 'query (required), kind ("page" | "blog" | "original" | "faq" | "person"), limit (1-25)',
    readOnly: true,
  },
  {
    name: 'get_page_markdown',
    title: 'Get a Stride page as markdown',
    description:
      'The full markdown of any public Stride page, by path — for example "/pricing", "/milestones" or "/blog/some-post". Same content the page shows, without layout. Authenticated and per-person paths are refused.',
    inputSummary: 'path (required, e.g. "/pricing")',
    readOnly: true,
  },
  {
    name: 'list_pages',
    title: 'List Stride pages',
    description:
      'Every public Stride page with a markdown representation, with its path and its .md URL. Use it to discover what can be fetched before fetching.',
    inputSummary: 'no parameters',
    readOnly: true,
  },
  {
    name: 'answer_faq',
    title: 'Answer from the Stride FAQ',
    description:
      'The Stride FAQ entry that best answers a question about joining, membership fees, where runs meet, how often the club runs, or what to expect at an event. Returns the question and the club\'s own published answer, or nothing when no entry is close.',
    inputSummary: 'question (required)',
    readOnly: true,
  },
]

export const MCP_SERVER_VERSION = '1.0.0'

export const PRODUCT_SERVER = {
  name: 'stride-run-club',
  path: '/mcp',
  title: 'Stride Run Club',
  description:
    'Read-only access to Stride Run Club event, pricing, leaderboard and milestone data for Bengaluru. Includes interactive event and leaderboard views.',
  tools: PRODUCT_TOOLS,
} as const

export const DOCS_SERVER = {
  name: 'stride-run-club-docs',
  path: '/mcp/docs',
  title: 'Stride Run Club Documentation',
  description:
    'Search and fetch everything Stride Run Club publishes — blog posts, FAQ, pricing rules, milestone rules and every public page as markdown.',
  tools: DOCS_TOOLS,
} as const

export const ALL_SERVERS = [PRODUCT_SERVER, DOCS_SERVER]

/** Sample questions each server can answer. Used by the ARD catalog entries. */
export const REPRESENTATIVE_QUERIES: Record<string, string[]> = {
  [PRODUCT_SERVER.name]: [
    'what running events are happening in Bengaluru this weekend',
    'how much does the next Stride trail race cost',
    'which Stride runs are free and beginner friendly',
    'who has attended the most Stride runs',
  ],
  [DOCS_SERVER.name]: [
    'is there a membership fee to join Stride Run Club',
    'how do Stride milestone tiers work',
    'where does Stride Run Club meet in Bengaluru',
    'what is the Lake Hop Project',
  ],
}
