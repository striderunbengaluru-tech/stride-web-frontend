import { getRequestOrigin } from '@/lib/site-url'
import { NLWEB_VERSION } from '@/lib/nlweb'

/**
 * OpenAPI description of Stride's public HTTP endpoints.
 *
 * Referenced as `service-desc` from `/.well-known/api-catalog` and from the
 * homepage `Link` header. Scope is deliberately narrow: `/ask` and the markdown
 * representation. The MCP servers are described by their own server card, which
 * is the format an MCP host actually reads — describing them here as well would
 * be a second copy to drift.
 */

export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  const origin = getRequestOrigin(request)

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Stride Run Club public API',
      version: '1.0.0',
      summary: 'Natural-language query and markdown representation for Stride Run Club.',
      description:
        'Read-only endpoints over the data Stride Run Club publishes on its website. No authentication: there is nothing to authenticate, and no credential is issued or accepted. There is no write API — registration, payment and check-in are performed by the person in their own browser. For tool-shaped access, use the MCP servers described at /.well-known/mcp/server-card.json.',
      contact: { name: 'Stride Run Club', email: 'striderunclubbengaluru@gmail.com', url: `${origin}/contact-us` },
      license: { name: 'Content © Stride Run Club', url: `${origin}/terms-of-service` },
      termsOfService: `${origin}/terms-of-service`,
    },
    servers: [{ url: origin, description: 'Stride Run Club' }],
    externalDocs: { description: 'Site manual for agents', url: `${origin}/llms.txt` },
    tags: [
      { name: 'nlweb', description: 'Microsoft NLWeb natural-language query protocol' },
      { name: 'markdown', description: 'Markdown representation of any public page' },
    ],
    paths: {
      '/ask': {
        get: {
          tags: ['nlweb'],
          operationId: 'askGet',
          summary: 'Ask a question, or describe the endpoint',
          description:
            'With a `query`, returns schema.org items. Without one, returns a self-description including usage and limits.',
          parameters: [
            { name: 'query', in: 'query', required: false, schema: { type: 'string', maxLength: 500 }, example: 'upcoming 10k runs in Bengaluru' },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 25, default: 10 } },
            { name: 'stream', in: 'query', required: false, schema: { type: 'string', enum: ['1'] }, description: 'Respond with SSE instead of JSON.' },
            { name: 'sandbox', in: 'query', required: false, schema: { type: 'string', enum: ['1'] }, description: 'Answer from synthetic fixtures instead of live data.' },
          ],
          responses: {
            '200': {
              description: 'NLWeb response, or a self-description when no query was given.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/NlwebResponse' } },
                'text/event-stream': { schema: { type: 'string', description: 'SSE: a start event, one result event per item, then complete.' } },
              },
            },
            '400': { description: 'Query too long.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        post: {
          tags: ['nlweb'],
          operationId: 'askPost',
          summary: 'Ask a question',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AskRequest' } } },
          },
          responses: {
            '200': {
              description: 'NLWeb response.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/NlwebResponse' } },
                'text/event-stream': { schema: { type: 'string' } },
              },
            },
            '400': { description: 'Missing or invalid query.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/index.md': {
        get: {
          tags: ['markdown'],
          operationId: 'siteRootMarkdown',
          summary: 'The site root as markdown',
          responses: {
            '200': {
              description: 'Markdown opening with a --- frontmatter block.',
              content: { 'text/markdown': { schema: { type: 'string' } } },
            },
          },
        },
      },
      '/{path}.md': {
        get: {
          tags: ['markdown'],
          operationId: 'pageMarkdown',
          summary: 'Any public page as markdown',
          description:
            'Append `.md` to a public page path. Authenticated and per-person paths — profiles, /my-runs, event confirmations, /admin, /api — return 404 with a markdown recovery body. Call /.well-known/agent-skills/index.json or the docs MCP `list_pages` tool for what exists.',
          parameters: [
            { name: 'path', in: 'path', required: true, schema: { type: 'string' }, example: 'events/stride-labs' },
          ],
          responses: {
            '200': { description: 'Markdown with frontmatter.', content: { 'text/markdown': { schema: { type: 'string' } } } },
            '404': { description: 'No markdown representation. Body is markdown pointing at the sitemap.', content: { 'text/markdown': { schema: { type: 'string' } } } },
          },
        },
      },
    },
    components: {
      schemas: {
        AskRequest: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1, maxLength: 500, example: 'is there a membership fee for Stride Run Club' },
            limit: { type: 'integer', minimum: 1, maximum: 25, default: 10 },
            prefer: {
              type: 'object',
              properties: { streaming: { type: 'boolean', default: false } },
            },
          },
        },
        NlwebResponse: {
          type: 'object',
          required: ['_meta', 'results'],
          properties: {
            _meta: {
              type: 'object',
              required: ['response_type', 'version'],
              properties: {
                response_type: { type: 'string', enum: ['items', 'description', 'error'] },
                version: { type: 'string', example: NLWEB_VERSION },
                query: { type: 'string' },
                total: { type: 'integer', description: 'Items found before the limit was applied.' },
                sandbox: { type: 'boolean' },
              },
            },
            results: {
              type: 'array',
              description:
                'schema.org items. SportsEvent for events, BlogPosting for posts, Question for FAQ answers, EventSeries for Stride Originals, Person for Lead Striders, WebPage otherwise.',
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            _meta: { type: 'object', properties: { response_type: { type: 'string', enum: ['error'] }, version: { type: 'string' } } },
            error: { type: 'string' },
            usage: { type: 'string' },
          },
        },
      },
    },
  }

  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
