import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getRequestOrigin } from '@/lib/site-url'
import { searchDocs, answerFaq, listDocPages, getPageMarkdown } from '@/lib/mcp/docs'
import { DOCS_SERVER, MCP_SERVER_VERSION } from '@/lib/mcp/registry'
import { serveMcp, unauthorized, jsonResult, notFoundResult } from '@/lib/mcp/serve'
import { checkRateLimit, tooManyRequests, READ_LIMIT } from '@/lib/rate-limit'

/**
 * Stride's documentation MCP server — the "learn" surface next to `/mcp`'s "do".
 *
 * Same protocol, different job: `/mcp` answers "what is happening and what does
 * it cost" from the database, this one answers "what does Stride say about X"
 * from the published content. Splitting them means an agent that only needs
 * prose does not have to load seven event tools to get it.
 *
 * `get_page_markdown` renders through the same @/lib/markdown/render module the
 * `.md` URLs use, gated by the same `isNegotiablePath` allowlist — so this tool
 * cannot read a page the HTTP route would refuse.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DOC_KINDS = ['page', 'blog', 'faq', 'person'] as const

function buildServer(origin: string): McpServer {
  const abs = (path: string) => `${origin}${path}`

  const server = new McpServer(
    { name: DOCS_SERVER.name, version: MCP_SERVER_VERSION },
    {
      instructions:
        "Documentation for Stride Run Club, a running community in Bengaluru, India. Start with search_docs for any question about what Stride says — membership, pricing rules, milestone tiers, run formats, the team. Use answer_faq for the common joining questions, get_page_markdown to read a whole page, and list_pages to see what can be read. For live event data and prices use the separate server at /mcp instead.",
    },
  )

  server.registerTool(
    'search_docs',
    {
      title: DOCS_SERVER.tools[0].title,
      description: DOCS_SERVER.tools[0].description,
      annotations: { readOnlyHint: true },
      inputSchema: {
        query: z.string().min(1).describe('A natural-language question or keywords.'),
        kind: z.enum(DOC_KINDS).optional()
          .describe('Restrict to one kind of document.'),
        limit: z.number().int().min(1).max(25).optional()
          .describe('Maximum results. Defaults to 8.'),
      },
    },
    async ({ query, kind, limit }) => {
      const results = searchDocs(query, { kind, limit })
      return jsonResult({
        query,
        results: results.map(r => ({
          ...r,
          url: r.path ? abs(r.path) : null,
          markdownUrl: r.path ? abs(r.path === '/' ? '/index.md' : `${r.path}.md`) : null,
        })),
        returned: results.length,
        note: results.length === 0
          ? 'Nothing in the Stride corpus matched. Try get_club_info on the /mcp server, or list_pages here.'
          : 'Fetch markdownUrl, or call get_page_markdown, for the full text of a result.',
      })
    },
  )

  server.registerTool(
    'get_page_markdown',
    {
      title: DOCS_SERVER.tools[1].title,
      description: DOCS_SERVER.tools[1].description,
      annotations: { readOnlyHint: true },
      inputSchema: {
        path: z.string().min(1)
          .describe('A site path, e.g. "/pricing", "/milestones" or "/blog/some-post". A trailing ".md" is accepted.'),
      },
    },
    async ({ path }) => {
      const doc = await getPageMarkdown(path, abs)
      if (!doc) {
        return notFoundResult(
          `"${path}" has no markdown representation. It is either not a Stride page or it is authenticated or per-person — profiles, /my-runs, event confirmations, /admin and /api are all excluded. Call list_pages for what can be read.`,
        )
      }
      return jsonResult({ ...doc, url: abs(doc.path) })
    },
  )

  server.registerTool(
    'list_pages',
    {
      title: DOCS_SERVER.tools[2].title,
      description: DOCS_SERVER.tools[2].description,
      annotations: { readOnlyHint: true },
    },
    async () => jsonResult({
      pages: listDocPages().map(page => ({
        ...page,
        url: abs(page.path),
        markdownUrl: abs(page.markdown),
      })),
      note: 'Athlete profiles at /profile/[username] are deliberately absent — they are per-person and members can make them private.',
    }),
  )

  server.registerTool(
    'answer_faq',
    {
      title: DOCS_SERVER.tools[3].title,
      description: DOCS_SERVER.tools[3].description,
      annotations: { readOnlyHint: true },
      inputSchema: {
        question: z.string().min(1).describe('The question to answer, in plain language.'),
      },
    },
    async ({ question }) => {
      const match = answerFaq(question)
      if (!match) {
        return jsonResult({
          matched: false,
          note: 'No FAQ entry is close to that question. Try search_docs, or get_club_info on the /mcp server.',
          faqUrl: abs('/'),
        })
      }
      return jsonResult({
        matched: true,
        question: match.question,
        answer: match.answer,
        source: abs('/'),
      })
    },
  )

  return server
}

async function handle(request: Request): Promise<Response> {
  const origin = getRequestOrigin(request)

  const limit = checkRateLimit(request, READ_LIMIT)
  if (!limit.ok) return tooManyRequests(limit, `${origin}/auth.md`)

  if (request.headers.get('authorization')) return unauthorized(origin)
  return serveMcp(request, () => buildServer(origin))
}

/**
 * Self-description for anything that opened this URL without speaking MCP —
 * same reasoning as the product server: a `406` protocol error is spec-correct
 * and tells the reader nothing about how to fix it.
 */
function card(request: Request): Response {
  const origin = getRequestOrigin(request)
  return Response.json(
    {
      name: DOCS_SERVER.name,
      title: DOCS_SERVER.title,
      description: DOCS_SERVER.description,
      version: MCP_SERVER_VERSION,
      serverUrl: `${origin}${DOCS_SERVER.path}`,
      transport: 'streamable-http',
      authentication: { required: false, type: 'none', documentation: `${origin}/auth.md` },
      tools: DOCS_SERVER.tools.map(tool => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputs: tool.inputSummary,
        readOnly: tool.readOnly,
      })),
      productServer: `${origin}/mcp`,
      fullServerCard: `${origin}/.well-known/mcp/server-card.json`,
      howToCall:
        'POST JSON-RPC with Accept: application/json, text/event-stream. This GET response is a courtesy description, not the MCP transport.',
    },
    {
      headers: {
        'Allow': 'GET, POST, DELETE, OPTIONS',
        'Vary': 'Accept',
        'Cache-Control': 'public, max-age=0, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}

export async function GET(request: Request): Promise<Response> {
  return (request.headers.get('accept') ?? '').includes('text/event-stream')
    ? handle(request)
    : card(request)
}

export const POST = handle
export const DELETE = handle

export async function OPTIONS(request: Request): Promise<Response> {
  return card(request)
}
