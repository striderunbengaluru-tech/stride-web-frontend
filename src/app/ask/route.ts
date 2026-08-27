import { z } from 'zod'
import { getRequestOrigin } from '@/lib/site-url'
import { answerQuery, NLWEB_VERSION } from '@/lib/nlweb'
import { isSandbox } from '@/lib/mcp/data'
import { checkRateLimit, tooManyRequests, rateLimitHeaders, ASK_LIMIT } from '@/lib/rate-limit'

/**
 * Microsoft's NLWeb `/ask` endpoint.
 *
 * `POST /ask` with `{ "query": "..." }` returns `{ _meta, results }` where the
 * results are schema.org items. `GET /ask?query=...` does the same, because a
 * question in a URL is something a person can paste and an agent can cite.
 *
 * Streaming: send `Accept: text/event-stream`, or `prefer.streaming` in the
 * body, or `?stream=1`, and the same answer arrives as SSE — `start`, one
 * `result` per item, then `complete`. The retrieval is not incremental (it is a
 * keyword scan over a few dozen documents), so streaming here buys a consumer
 * the ability to render the first item immediately rather than genuine
 * back-pressure. Saying so is better than implying otherwise.
 *
 * Mounted at `/ask`, outside `/api`, for the same reason as `/mcp`: robots.txt
 * disallows `/api/` and this endpoint is meant to be found.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AskSchema = z.object({
  query: z.string().trim().min(1, 'query must not be empty').max(500, 'query must be 500 characters or fewer'),
  limit: z.number().int().min(1).max(25).optional(),
  prefer: z.object({ streaming: z.boolean().optional() }).optional(),
  // Accepted and ignored: NLWeb clients send these and a hard rejection would
  // fail a conformant request over a field Stride has no modes for.
  site: z.string().optional(),
  mode: z.string().optional(),
  streaming: z.boolean().optional(),
}).strip()

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
  'Access-Control-Allow-Origin': '*',
  'Vary': 'Accept',
}

function badRequest(message: string): Response {
  return Response.json(
    {
      _meta: { response_type: 'error', version: NLWEB_VERSION },
      error: message,
      usage: 'POST { "query": "upcoming runs in Bengaluru" } or GET /ask?query=...',
    },
    { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
  )
}

function wantsStream(request: Request, url: URL, prefer?: boolean): boolean {
  if (prefer === true) return true
  if (url.searchParams.get('stream') === '1') return true
  return (request.headers.get('accept') ?? '').includes('text/event-stream')
}

/** SSE frame. The blank line terminates the event — without it nothing flushes. */
function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function streamResponse(
  answer: Awaited<ReturnType<typeof answerQuery>>,
): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sse('start', {
        ...answer._meta,
        response_type: 'start',
      })))

      answer.results.forEach((result, index) => {
        controller.enqueue(encoder.encode(sse('result', { index, item: result })))
      })

      controller.enqueue(encoder.encode(sse('complete', {
        response_type: 'complete',
        version: NLWEB_VERSION,
        returned: answer.results.length,
        total: answer._meta.total,
      })))

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      // No caching on a stream: a cached SSE body replays a stale answer to
      // every later reader with no way to tell it is old.
      'Cache-Control': 'no-cache, no-store',
      'Connection': 'keep-alive',
      // Vercel and most proxies buffer by default, which would hold every event
      // until the stream closed and defeat the point.
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Vary': 'Accept',
    },
  })
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url)

  // Tighter than the MCP endpoints: every /ask call scans the whole corpus.
  const rate = checkRateLimit(request, ASK_LIMIT)
  if (!rate.ok) return tooManyRequests(rate, `${getRequestOrigin(request)}/auth.md`)

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return badRequest('Body must be JSON.')
  }

  const parsed = AskSchema.safeParse(raw)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request body.')
  }

  const { query, limit, prefer, streaming } = parsed.data
  const answer = await answerQuery(query, getRequestOrigin(request), {
    limit,
    sandbox: isSandbox(url),
  })

  return wantsStream(request, url, prefer?.streaming ?? streaming)
    ? streamResponse(answer)
    : Response.json(answer, { headers: { ...JSON_HEADERS, ...rateLimitHeaders(rate) } })
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)

  const rate = checkRateLimit(request, ASK_LIMIT)
  if (!rate.ok) return tooManyRequests(rate, `${getRequestOrigin(request)}/auth.md`)

  const query = url.searchParams.get('query') ?? url.searchParams.get('q')

  if (!query || query.trim().length === 0) {
    // No query is not an error for a GET — an agent that found this URL in the
    // API catalog is asking what it does. Answer that.
    return Response.json(
      {
        _meta: { response_type: 'description', version: NLWEB_VERSION },
        name: 'Stride Run Club NLWeb endpoint',
        description:
          'Ask a natural-language question about Stride Run Club events, pricing, milestone tiers, blog posts or the team. Returns schema.org items — SportsEvent, BlogPosting, Question, Person, WebPage.',
        usage: {
          post: 'POST /ask with { "query": "...", "limit": 10, "prefer": { "streaming": false } }',
          get: 'GET /ask?query=...',
          streaming: 'Accept: text/event-stream, or prefer.streaming, or ?stream=1. Events: start, result, complete.',
          sandbox: 'Add ?sandbox=1 to answer from fixtures instead of live data.',
        },
        limits: { maxQueryLength: 500, maxResults: 25, defaultResults: 10 },
        openapi: `${getRequestOrigin(request)}/openapi.json`,
        examples: [
          'upcoming 10k runs in Bengaluru',
          'is there a membership fee for Stride Run Club',
          'how do the milestone tiers work',
        ],
      },
      { headers: JSON_HEADERS },
    )
  }

  if (query.length > 500) return badRequest('query must be 500 characters or fewer')

  const answer = await answerQuery(query, getRequestOrigin(request), {
    limit: Number(url.searchParams.get('limit')) || undefined,
    sandbox: isSandbox(url),
  })

  return wantsStream(request, url)
    ? streamResponse(answer)
    : Response.json(answer, { headers: { ...JSON_HEADERS, ...rateLimitHeaders(rate) } })
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  })
}
