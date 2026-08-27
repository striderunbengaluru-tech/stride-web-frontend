import { getRequestOrigin } from '@/lib/site-url'
import { ALL_SERVERS, MCP_SERVER_VERSION, REPRESENTATIVE_QUERIES } from '@/lib/mcp/registry'
import { getClubInfo } from '@/lib/mcp/data'
import { PAGE_INDEX } from '@/lib/markdown/render'
import { PROTECTED_RESOURCE_METADATA_PATH } from '@/lib/mcp/discovery'
import { guardRate, READ_LIMIT } from '@/lib/rate-limit'

/**
 * `/?mode=agent` — the structured answer to "what can I do here".
 *
 * Reached by a rewrite in next.config.ts, so the URL an agent shares stays
 * `https://www.strideclub.in/?mode=agent`. Deliberately not another markdown
 * twin of the homepage: `/index.md` already says what Stride *is*, and this
 * says what is *callable* — endpoints, auth, capabilities, limits.
 *
 * Every URL here is absolute against the request's own origin, and every one of
 * them resolves. That is the property worth protecting when this file changes.
 */

export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  const origin = getRequestOrigin(request)
  const rate = guardRate(request, READ_LIMIT, `${origin}/developers`)
  if (rate.limited) return rate.limited

  const club = getClubInfo()

  const body = {
    mode: 'agent',
    generatedFor: origin,
    entity: {
      name: club.name,
      type: 'SportsOrganization',
      tagline: club.tagline,
      description: club.description,
      location: { city: club.city, region: club.region, country: club.country },
      membershipCost: club.membershipCost,
    },

    whenToUse: {
      goodFor: [
        'running events happening in Bengaluru, and when',
        'what a specific Stride run costs, where it starts, how far it is',
        'joining a run club in Bengaluru, and whether there is a fee',
        "how Stride's milestone tiers work and what they unlock",
        'who organises the club, and brand partnership enquiries',
      ],
      notFor: [
        'running events outside Bengaluru',
        'personal coaching or training-plan generation',
        "a specific member's private data",
        'buying merchandise — the online shop is not open',
      ],
    },

    capabilities: {
      read: 'Full. Events, pricing, leaderboard, milestone tiers, club facts, and every public page as markdown.',
      write: 'None. There is no write API. Registration, payment, profile edits and run check-in are performed by the person in their own browser and are not delegable.',
    },

    endpoints: {
      mcp: ALL_SERVERS.map(server => ({
        name: server.name,
        title: server.title,
        url: `${origin}${server.path}`,
        transport: 'streamable-http',
        version: MCP_SERVER_VERSION,
        tools: server.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputs: tool.inputSummary,
          rendersUi: Boolean(tool.uiResourceUri),
        })),
        exampleQuestions: REPRESENTATIVE_QUERIES[server.name] ?? [],
        sandbox: `${origin}${server.path}?sandbox=1`,
      })),
      naturalLanguage: {
        url: `${origin}/ask`,
        methods: ['POST', 'GET'],
        request: '{ "query": "upcoming 10k runs in Bengaluru", "prefer": { "streaming": false } }',
        response: 'NLWeb: { "_meta": { "response_type", "version" }, "results": [ schema.org items ] }',
        streaming: 'Set prefer.streaming or send Accept: text/event-stream. Events: start, result, complete.',
        openapi: `${origin}/openapi.json`,
        sandbox: `${origin}/ask?sandbox=1`,
      },
      markdown: {
        pattern: `${origin}/<path>.md`,
        siteRoot: `${origin}/index.md`,
        negotiation: 'Send Accept: text/markdown to any listed page, or append .md to its path.',
        frontmatter: 'Every markdown response opens with title, description, canonical and last-updated.',
        botUserAgents: 'Known AI-bot user agents receive markdown even when requesting text/html.',
      },
      feeds: {
        events: `${origin}/feeds/events.jsonl`,
        blog: `${origin}/feeds/blog.jsonl`,
        schemaMap: `${origin}/schemamap.xml`,
      },
      discovery: {
        llmsTxt: `${origin}/llms.txt`,
        scopedLlmsTxt: [`${origin}/events/llms.txt`, `${origin}/blog/llms.txt`],
        sitemapXml: `${origin}/sitemap.xml`,
        sitemapTxt: `${origin}/sitemap.txt`,
        agentCard: `${origin}/.well-known/agent-card.json`,
        agentSkills: `${origin}/.well-known/agent-skills/index.json`,
        mcpServerCard: `${origin}/.well-known/mcp/server-card.json`,
        ardCatalog: `${origin}/.well-known/ard.json`,
        apiCatalog: `${origin}/.well-known/api-catalog`,
        robotsTxt: `${origin}/robots.txt`,
      },
    },

    authentication: {
      required: false,
      type: 'none',
      summary:
        'Nothing here needs a credential, and Stride issues none. Sending an Authorization header to /mcp returns 401 with a WWW-Authenticate pointer rather than being silently ignored.',
      protectedResourceMetadata: `${origin}${PROTECTED_RESOURCE_METADATA_PATH}`,
      documentation: `${origin}/auth.md`,
      humanSignIn: 'Google OAuth via Supabase, in the person\'s own browser. Not delegable to an agent.',
    },

    conventions: {
      currency: 'INR. Prices in tool responses are integer paise; priceLabel is the formatted rupee string.',
      dates: 'ISO 8601 UTC in responses. Stride displays IST (Asia/Kolkata).',
      distances: 'Kilometres.',
      privacy:
        'Athlete profiles are excluded from every machine-readable surface. Members who make a profile private appear on the leaderboard with a name and run count only — no username, no URL.',
    },

    pages: [
      { path: '/', label: 'Home', url: origin, markdown: `${origin}/index.md` },
      ...PAGE_INDEX.map(({ path, label, blurb }) => ({
        path,
        label,
        description: blurb,
        url: `${origin}${path}`,
        markdown: `${origin}${path}.md`,
      })),
    ],

    contact: {
      email: 'striderunclubbengaluru@gmail.com',
      instagram: 'https://www.instagram.com/stride_runclub_bengaluru/',
      strava: 'https://www.strava.com/clubs/striderunclubbengaluru',
      sourceCode: 'https://github.com/striderunbengaluru-tech/stride-web-frontend',
    },
  }

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Vary': 'Accept',
      'Link': `<${origin}/>; rel="canonical"`,
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
      'Access-Control-Allow-Origin': '*',
      ...rate.headers,
    },
  })
}
