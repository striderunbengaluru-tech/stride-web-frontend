import { getRequestOrigin } from '@/lib/site-url'
import { NLWEB_VERSION } from '@/lib/nlweb'
import { guardRate, READ_LIMIT } from '@/lib/rate-limit'

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

/** The rate-limit headers, referenced from every documented 200. */
const RATE_HEADERS = {
  'RateLimit-Limit': { $ref: '#/components/headers/RateLimit-Limit' },
  'RateLimit-Remaining': { $ref: '#/components/headers/RateLimit-Remaining' },
  'RateLimit-Reset': { $ref: '#/components/headers/RateLimit-Reset' },
  'RateLimit-Policy': { $ref: '#/components/headers/RateLimit-Policy' },
} as const

export function GET(request: Request): Response {
  const origin = getRequestOrigin(request)
  const rate = guardRate(request, READ_LIMIT, `${origin}/developers`)
  if (rate.limited) return rate.limited

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Stride Run Club public API',
      version: '1.0.0',
      summary: 'Natural-language query and markdown representation for Stride Run Club.',
      description:
        'Read-only endpoints over the data Stride Run Club publishes on its website. No authentication: there is nothing to authenticate, and no credential is issued or accepted. There is no write API — registration, payment and check-in are performed by the person in their own browser. For tool-shaped access, use the MCP servers described at /.well-known/mcp/server-card.json.\n\nConventions. Errors are RFC 9457 problem details with a stable `code` to branch on and a `hint` for what to do; never parse `detail`. Pagination is cursor-based: read `_meta.next_cursor` and pass it back as `cursor`, treating it as opaque. Every response carries RateLimit-* headers and a 429 carries Retry-After. POST accepts an Idempotency-Key so a retry replays the first response rather than re-running the query.',
      contact: { name: 'Stride Run Club', email: 'striderunclubbengaluru@gmail.com', url: `${origin}/contact-us` },
      license: { name: 'Content © Stride Run Club', url: `${origin}/terms-of-service` },
      termsOfService: `${origin}/terms-of-service`,
    },
    servers: [{ url: origin, description: 'Stride Run Club' }],
    externalDocs: { description: 'Site manual for agents', url: `${origin}/llms.txt` },
    tags: [
      { name: 'nlweb', description: 'Microsoft NLWeb natural-language query protocol' },
      { name: 'markdown', description: 'Markdown representation of any public page' },
      { name: 'discovery', description: 'Machine-readable descriptions of what is here' },
      { name: 'feeds', description: 'Bulk structured data as JSON Lines' },
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
            { $ref: '#/components/parameters/Cursor' },
          ],
          responses: {
            '200': {
              description: 'NLWeb response, or a self-description when no query was given.',
              headers: {
                'RateLimit-Limit': { $ref: '#/components/headers/RateLimit-Limit' },
                'RateLimit-Remaining': { $ref: '#/components/headers/RateLimit-Remaining' },
                'RateLimit-Reset': { $ref: '#/components/headers/RateLimit-Reset' },
              },
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/NlwebResponse' } },
                'text/event-stream': { schema: { type: 'string', description: 'SSE: a start event, one result event per item, then complete.' } },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '404': { $ref: '#/components/responses/NotFound' },
            '429': { $ref: '#/components/responses/TooManyRequests' },
          },
        },
        post: {
          tags: ['nlweb'],
          operationId: 'askPost',
          summary: 'Ask a question',
          parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AskRequest' } } },
          },
          responses: {
            '200': {
              description: 'NLWeb response.',
              headers: {
                'RateLimit-Limit': { $ref: '#/components/headers/RateLimit-Limit' },
                'RateLimit-Remaining': { $ref: '#/components/headers/RateLimit-Remaining' },
                'RateLimit-Reset': { $ref: '#/components/headers/RateLimit-Reset' },
                'Idempotency-Key': {
                  description: 'Echoed when the request carried one.',
                  schema: { type: 'string' },
                },
                'Idempotent-Replayed': {
                  description: 'Present and "true" when this response was replayed from a stored one rather than recomputed.',
                  schema: { type: 'string', enum: ['true'] },
                },
              },
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/NlwebResponse' } },
                'text/event-stream': { schema: { type: 'string' } },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '429': { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },
      '/openapi.json': {
        get: {
          tags: ['discovery'],
          operationId: 'getOpenApi',
          summary: 'This document',
          description: 'The OpenAPI description of every public Stride endpoint.',
          responses: {
            '200': {
              description: 'OpenAPI 3.1 document.',
              headers: RATE_HEADERS,
              content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
            },
            '429': { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },
      '/?mode=agent': {
        get: {
          tags: ['discovery'],
          operationId: 'getAgentView',
          summary: 'Structured view of the whole site',
          description:
            'What is callable here — endpoints, auth, capabilities, conventions and the page index — as one JSON document. Reached by adding `?mode=agent` to the site root.',
          responses: {
            '200': {
              description: 'Agent view.',
              headers: RATE_HEADERS,
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentView' } } },
            },
            '429': { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },
      '/feeds/events.jsonl': {
        get: {
          tags: ['feeds'],
          operationId: 'getEventsFeed',
          summary: 'Every published event as schema.org SportsEvent',
          description: 'JSON Lines: one `SportsEvent` object per line, offers priced in INR.',
          responses: {
            '200': {
              description: 'One JSON object per line.',
              headers: { ...RATE_HEADERS, 'X-Feed-Records': { description: 'Number of lines in the body.', schema: { type: 'integer' } } },
              content: {
                'application/jsonl': { schema: { type: 'string', description: 'Newline-delimited schema.org SportsEvent objects.' } },
                'application/json': { schema: { $ref: '#/components/schemas/SchemaOrgItem' }, examples: { line: { summary: 'A single line of the feed', value: { '@context': 'https://schema.org', '@type': 'SportsEvent' } } } },
              },
            },
            '429': { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },
      '/feeds/blog.jsonl': {
        get: {
          tags: ['feeds'],
          operationId: 'getBlogFeed',
          summary: 'Every blog post as schema.org BlogPosting',
          description: 'JSON Lines: one `BlogPosting` per line, including the full article body.',
          responses: {
            '200': {
              description: 'One JSON object per line.',
              headers: { ...RATE_HEADERS, 'X-Feed-Records': { description: 'Number of lines in the body.', schema: { type: 'integer' } } },
              content: {
                'application/jsonl': { schema: { type: 'string' } },
                'application/json': { schema: { $ref: '#/components/schemas/SchemaOrgItem' } },
              },
            },
            '429': { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },
      '/.well-known/mcp/server-card.json': {
        get: {
          tags: ['discovery'],
          operationId: 'getMcpServerCard',
          summary: 'MCP server card',
          description: 'Tool inventory and transport for the product MCP server, generated from the live registry.',
          responses: {
            '200': {
              description: 'Server card.',
              headers: RATE_HEADERS,
              content: { 'application/json': { schema: { $ref: '#/components/schemas/McpServerCard' } } },
            },
            '429': { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },
      '/.well-known/agent-card.json': {
        get: {
          tags: ['discovery'],
          operationId: 'getAgentCard',
          summary: 'A2A agent card',
          responses: {
            '200': {
              description: 'Agent-to-agent capability descriptor.',
              headers: RATE_HEADERS,
              content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
            },
            '429': { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },
      '/.well-known/agent-skills/index.json': {
        get: {
          tags: ['discovery'],
          operationId: 'getAgentSkills',
          summary: 'Agent skills index',
          responses: {
            '200': {
              description: 'Every capability with its endpoint.',
              headers: RATE_HEADERS,
              content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
            },
            '429': { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },
      '/.well-known/ard.json': {
        get: {
          tags: ['discovery'],
          operationId: 'getArdCatalog',
          summary: 'Agentic Resource Discovery catalog',
          description: 'Also served at the predecessor path `/.well-known/ai-catalog.json`.',
          responses: {
            '200': {
              description: 'ARD catalog.',
              headers: RATE_HEADERS,
              content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
            },
            '429': { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },
      '/.well-known/api-catalog': {
        get: {
          tags: ['discovery'],
          operationId: 'getApiCatalog',
          summary: 'RFC 9727 API catalog',
          responses: {
            '200': {
              description: 'Linkset naming every API in the catalog.',
              headers: RATE_HEADERS,
              content: {
                'application/linkset+json': { schema: { type: 'object', additionalProperties: true } },
                'application/json': { schema: { type: 'object', additionalProperties: true } },
              },
            },
            '429': { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },
      '/.well-known/oauth-protected-resource': {
        get: {
          tags: ['discovery'],
          operationId: 'getProtectedResourceMetadata',
          summary: 'RFC 9728 protected-resource metadata',
          description:
            'Reports `authorization_servers: []` and `authorization_required: false`. Read that literally — Stride issues no agent credentials. See /auth.md.',
          responses: {
            '200': {
              description: 'Protected-resource metadata.',
              headers: RATE_HEADERS,
              content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
            },
            '429': { $ref: '#/components/responses/TooManyRequests' },
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
              headers: RATE_HEADERS,
              content: { 'text/markdown': { schema: { type: 'string' } } },
            },
            '404': { $ref: '#/components/responses/NotFound' },
            '429': { $ref: '#/components/responses/TooManyRequests' },
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
            '200': {
              description: 'Markdown with frontmatter.',
              headers: { ...RATE_HEADERS, 'X-Markdown-Tokens': { description: 'Rough token count for the body, at ~4 characters per token.', schema: { type: 'integer' } } },
              content: { 'text/markdown': { schema: { type: 'string' } } },
            },
            '429': { $ref: '#/components/responses/TooManyRequests' },
            '404': {
              description: 'No markdown representation. The body is markdown pointing at the sitemap, so a reader lands somewhere useful.',
              content: {
                'text/markdown': { schema: { type: 'string' } },
                'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } },
              },
            },
          },
        },
      },
    },
    components: {
      headers: {
        'RateLimit-Limit': {
          description: 'Requests allowed in the current window.',
          schema: { type: 'integer', example: 60 },
        },
        'RateLimit-Remaining': {
          description: 'Requests left in the current window.',
          schema: { type: 'integer', example: 59 },
        },
        'RateLimit-Reset': {
          description: 'Unix seconds at which the window resets.',
          schema: { type: 'integer' },
        },
        'Retry-After': {
          description: 'Seconds to wait before retrying. Present on 429.',
          schema: { type: 'integer', example: 42 },
        },
        'RateLimit-Policy': {
          description: 'The policy in force, as `<limit>;w=<window seconds>`.',
          schema: { type: 'string', example: '60;w=60' },
        },
      },
      // Declared once and referenced from every operation, so the error contract
      // is identical everywhere and a client can implement it once.
      responses: {
        BadRequest: {
          description: 'Malformed request. RFC 9457 problem details.',
          content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } },
        },
        NotFound: {
          description: 'No such endpoint or resource. RFC 9457 problem details.',
          content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } },
        },
        TooManyRequests: {
          description: 'Rate limited. RFC 9457 problem details.',
          headers: {
            'Retry-After': { $ref: '#/components/headers/Retry-After' },
            'RateLimit-Limit': { $ref: '#/components/headers/RateLimit-Limit' },
            'RateLimit-Remaining': { $ref: '#/components/headers/RateLimit-Remaining' },
            'RateLimit-Reset': { $ref: '#/components/headers/RateLimit-Reset' },
          },
          content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } },
        },
      },
      parameters: {
        IdempotencyKey: {
          name: 'Idempotency-Key',
          in: 'header',
          required: false,
          description:
            'Client-generated key. Retrying with the same key and the same body replays the first response instead of re-running the query, so a retry after a dropped connection costs nothing and does not consume rate-limit budget. Stored for 10 minutes.',
          schema: { type: 'string', maxLength: 255, example: '9f1c6a2e-5b7d-4c11-9d3e-2f8a1b4c7e60' },
        },
        Cursor: {
          name: 'cursor',
          in: 'query',
          required: false,
          description:
            'Opaque cursor from a previous response\'s `_meta.next_cursor`. Pass it back verbatim; do not decode or construct one.',
          schema: { type: 'string', maxLength: 128 },
        },
      },
      schemas: {
        SchemaOrgItem: {
          type: 'object',
          description: 'A schema.org node. `@type` decides the remaining fields.',
          required: ['@type'],
          properties: {
            '@context': { type: 'string', example: 'https://schema.org' },
            '@type': { type: 'string', example: 'SportsEvent' },
            '@id': { type: 'string', format: 'uri' },
            name: { type: 'string' },
            url: { type: 'string', format: 'uri' },
          },
          additionalProperties: true,
        },
        McpServerCard: {
          type: 'object',
          required: ['name', 'description', 'version', 'serverUrl', 'tools'],
          properties: {
            name: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            version: { type: 'string' },
            serverUrl: { type: 'string', format: 'uri' },
            transport: { type: 'string', example: 'streamable-http' },
            authentication: { type: 'object', additionalProperties: true },
            sandbox: { type: 'object', additionalProperties: true },
            tools: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'description'],
                properties: {
                  name: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  inputs: { type: 'string' },
                  readOnly: { type: 'boolean' },
                  uiResourceUri: { type: 'string' },
                },
              },
            },
          },
          additionalProperties: true,
        },
        AgentView: {
          type: 'object',
          required: ['mode', 'entity', 'capabilities', 'endpoints'],
          properties: {
            mode: { type: 'string', enum: ['agent'] },
            entity: { type: 'object', additionalProperties: true },
            whenToUse: {
              type: 'object',
              properties: {
                goodFor: { type: 'array', items: { type: 'string' } },
                notFor: { type: 'array', items: { type: 'string' } },
              },
            },
            capabilities: {
              type: 'object',
              properties: { read: { type: 'string' }, write: { type: 'string' } },
            },
            endpoints: { type: 'object', additionalProperties: true },
            authentication: { type: 'object', additionalProperties: true },
            conventions: { type: 'object', additionalProperties: true },
            pages: { type: 'array', items: { type: 'object', additionalProperties: true } },
            contact: { type: 'object', additionalProperties: true },
          },
          additionalProperties: true,
        },
        Problem: {
          type: 'object',
          description: 'RFC 9457 problem details, with a stable `code` to branch on and a `hint` for what to do.',
          required: ['type', 'title', 'status', 'code', 'detail'],
          properties: {
            type: { type: 'string', format: 'uri', description: 'Documentation URL for this error class.' },
            title: { type: 'string', example: 'Invalid request' },
            status: { type: 'integer', example: 400 },
            code: {
              type: 'string',
              description: 'Stable machine-readable code. Branch on this, never on `detail`.',
              enum: ['invalid_request', 'invalid_query', 'query_too_long', 'not_found', 'method_not_allowed', 'rate_limited', 'unsupported_credential'],
            },
            detail: { type: 'string', description: 'What went wrong, for a log or a human.' },
            hint: { type: 'string', description: 'What to do about it.' },
            documentation: { type: 'string', format: 'uri' },
            instance: { type: 'string', description: 'The path that produced the error.' },
            available: {
              type: 'array',
              items: { type: 'string', format: 'uri' },
              description: 'On a 404, endpoints that do exist under the same prefix.',
            },
          },
        },
        AskRequest: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1, maxLength: 500, example: 'is there a membership fee for Stride Run Club' },
            limit: { type: 'integer', minimum: 1, maximum: 25, default: 10 },
            cursor: {
              type: 'string',
              maxLength: 128,
              description: "Opaque cursor from a previous response's `_meta.next_cursor`.",
            },
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
                total: { type: 'integer', description: 'Items matching in total, across every page.' },
                returned: { type: 'integer', description: 'Items in this page.' },
                next_cursor: {
                  type: ['string', 'null'],
                  description: 'Pass back as `cursor` for the next page. Null on the last page.',
                },
                sandbox: { type: 'boolean' },
              },
            },
            results: {
              type: 'array',
              description:
                'schema.org items. SportsEvent for events, BlogPosting for posts, Question for FAQ answers, Person for Lead Striders, WebPage otherwise.',
              items: { type: 'object', additionalProperties: true },
            },
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
      ...rate.headers,
    },
  })
}
