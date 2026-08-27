import { z } from 'zod'
import { getRequestOrigin } from '@/lib/site-url'
import { answerQuery, decodeCursor, NLWEB_VERSION } from '@/lib/nlweb'
import { problem, ERROR_CODES } from '@/lib/api-errors'
import { replayIdempotent, recordIdempotent } from '@/lib/idempotency'
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
  /** Opaque, from a previous response's `_meta.next_cursor`. Never hand-made. */
  cursor: z.string().max(128).optional(),
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

/**
 * `400` as RFC 9457 problem details.
 *
 * The previous shape carried a human sentence and no code, so a client had to
 * string-match the prose to tell a too-long query from malformed JSON. `code` is
 * the thing to branch on; `detail` is for the log.
 */
function badRequest(
  origin: string,
  code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES],
  detail: string,
  hint: string,
): Response {
  return problem({
    status: 400,
    code,
    title: 'Invalid request',
    detail,
    hint,
    origin,
    extra: {
      usage: 'POST { "query": "upcoming runs in Bengaluru", "limit": 10 } or GET /ask?query=...',
      limits: { maxQueryLength: 500, maxResults: 25 },
    },
  })
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

  const origin = getRequestOrigin(request)

  /**
   * Idempotency-Key.
   *
   * /ask is a POST that does real work — it scans the whole corpus — and it is
   * rate limited. An agent that retries after a dropped connection would
   * otherwise pay for the scan twice and burn two requests of its budget for one
   * answer. With a key, the retry replays the first response byte for byte and
   * costs nothing.
   *
   * There is no write to protect here, because Stride exposes none. This is the
   * honest version of the guarantee: identical request, identical response, no
   * second execution.
   */
  const idempotencyKey = request.headers.get('idempotency-key')
  const bodyText = await request.text()

  if (idempotencyKey) {
    const replayed = replayIdempotent(idempotencyKey, bodyText)
    if (replayed) {
      return new Response(replayed, {
        headers: {
          ...JSON_HEADERS,
          ...rateLimitHeaders(rate),
          'Idempotency-Key': idempotencyKey,
          'Idempotent-Replayed': 'true',
        },
      })
    }
  }

  let raw: unknown
  try {
    raw = JSON.parse(bodyText)
  } catch {
    return badRequest(origin, ERROR_CODES.invalid_request, 'Body is not valid JSON.',
      'Send a JSON object, e.g. {"query":"upcoming runs"}.')
  }

  const parsed = AskSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return badRequest(
      origin,
      issue?.path?.[0] === 'query' ? ERROR_CODES.invalid_query : ERROR_CODES.invalid_request,
      issue?.message ?? 'Request body failed validation.',
      'Check the field named in "detail" against /openapi.json.',
    )
  }

  const { query, limit, cursor, prefer, streaming } = parsed.data

  let offset = 0
  if (cursor !== undefined) {
    const decoded = decodeCursor(cursor)
    if (decoded === null) {
      return badRequest(origin, ERROR_CODES.invalid_request,
        'The cursor is not one this endpoint issued.',
        'Pass back _meta.next_cursor from a previous response verbatim. Cursors are opaque and must not be constructed.')
    }
    offset = decoded
  }

  const answer = await answerQuery(query, origin, { limit, offset, sandbox: isSandbox(url) })

  if (wantsStream(request, url, prefer?.streaming ?? streaming)) return streamResponse(answer)

  const payload = JSON.stringify(answer)
  if (idempotencyKey) recordIdempotent(idempotencyKey, bodyText, payload)

  return new Response(payload, {
    headers: {
      ...JSON_HEADERS,
      ...rateLimitHeaders(rate),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
  })
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
          get: 'GET /ask?query=...&limit=10&cursor=...',
          pagination: 'Read _meta.next_cursor and pass it back as `cursor`. Null means the last page. Cursors are opaque — do not construct one.',
          idempotency: 'Send an Idempotency-Key header on POST to make a retry replay the first response instead of re-running the query.',
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

  const origin = getRequestOrigin(request)
  if (query.length > 500) {
    return badRequest(origin, ERROR_CODES.query_too_long,
      `query is ${query.length} characters; the maximum is 500.`,
      'Shorten the query. Long questions rarely retrieve better than short ones here.')
  }

  const cursor = url.searchParams.get('cursor')
  let offset = 0
  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (decoded === null) {
      return badRequest(origin, ERROR_CODES.invalid_request,
        'The cursor is not one this endpoint issued.',
        'Pass back _meta.next_cursor from a previous response verbatim.')
    }
    offset = decoded
  }

  const answer = await answerQuery(query, origin, {
    limit: Number(url.searchParams.get('limit')) || undefined,
    offset,
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
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Idempotency-Key',
      'Access-Control-Max-Age': '86400',
    },
  })
}
