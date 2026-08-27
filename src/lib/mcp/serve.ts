import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { PROTECTED_RESOURCE_METADATA_PATH } from './discovery'

/**
 * Widens a client's `Accept` header so the transport will answer it.
 *
 * The Streamable HTTP transport rejects any request that does not accept BOTH
 * `application/json` and `text/event-stream`, with `406 Not Acceptable`. That is
 * faithful to the spec — a conformant client must offer both, because the server
 * is free to answer either way.
 *
 * It is stricter than this server needs to be, though. A client that accepts
 * JSON can be served perfectly well with JSON, and turning it away with a 406
 * reads from the outside as a broken server — a probe sending
 * `Accept: application/json` got exactly that.
 *
 * So a request that accepts JSON (or anything) has `text/event-stream` added
 * before the transport sees it, purely to satisfy that check. What it then
 * receives is decided by `prefersJsonBody` below, which follows what the client
 * actually asked for. A request that accepts neither is left alone and still
 * gets its 406, because that one really is unservable.
 */
function widenAccept(request: Request): Request {
  const accept = request.headers.get('accept') ?? ''

  const acceptsJson = accept.includes('application/json')
  const acceptsAnything = accept.trim() === '' || accept.includes('*/*')
  const acceptsStream = accept.includes('text/event-stream')

  if (acceptsStream || !(acceptsJson || acceptsAnything)) return request

  const headers = new Headers(request.headers)
  headers.set('accept', 'application/json, text/event-stream')
  return new Request(request, { headers })
}

/**
 * The answer to a `GET` that asked for an SSE stream.
 *
 * The Streamable HTTP spec makes the server-initiated GET stream optional and
 * says a server that does not offer one SHOULD reply `405`. The transport
 * instead opens a `200 text/event-stream` and then never writes to it, because
 * this server is stateless and has nothing to push. That is the worst of both
 * answers: a client sees a successful stream, waits on it for a response that
 * will never come, and eventually reports the handshake as failed — which is
 * indistinguishable, from the outside, from a broken server.
 *
 * A `405` with a JSON-RPC error fails fast and says what to do instead. Both
 * spec-conformant and considerably kinder.
 */
export function sseNotSupported(origin: string, headers: Record<string, string> = {}): Response {
  return Response.json(
    {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message:
          'This server does not offer a server-initiated SSE stream. It is stateless and has nothing to push, so there is nothing to listen to. Send your JSON-RPC requests as POST to this same URL; each response comes back in that POST\'s own body.',
        data: {
          transport: 'streamable-http',
          method: 'POST',
          documentation: `${origin}/developers`,
          serverCard: `${origin}/.well-known/mcp/server-card.json`,
        },
      },
      id: null,
    },
    {
      status: 405,
      headers: {
        Allow: 'POST, DELETE, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        ...headers,
      },
    },
  )
}

/** Copies a response, adding headers, without touching the body stream. */
function withHeaders(response: Response, extra: Record<string, string>): Response {
  if (Object.keys(extra).length === 0) return response
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(extra)) headers.set(key, value)
  return new Response(response.body, { status: response.status, headers })
}

/**
 * A protocol error the SDK folded into a tool result, e.g.
 * `MCP error -32602: Tool foo not found`.
 */
const FOLDED_PROTOCOL_ERROR = /^MCP error (-?\d+):\s*([\s\S]*)$/

type JsonRpcish = {
  jsonrpc?: string
  id?: unknown
  result?: { isError?: boolean; content?: { type?: string; text?: string }[] }
}

/**
 * Lifts protocol errors back out of tool results and into JSON-RPC `error`.
 *
 * The SDK deliberately converts a failed dispatch — unknown tool, arguments that
 * fail their schema — into `{ result: { isError: true, content: [{ text: "MCP
 * error -32602: ..." }] } }`. That is a reasonable default when the consumer is
 * an LLM reading prose, and it is the wrong answer for a program: the JSON-RPC
 * `code` is stringified into English, so a caller has to regex the message to
 * learn that it passed a bad argument rather than that Stride had no data.
 *
 * So a result whose text matches the SDK's own protocol-error format is rewritten
 * into a real `error` object with the numeric `code` restored and the message
 * separated from it.
 *
 * Domain errors are left exactly as they are. "No published Stride event with
 * slug X" is a valid answer to a valid call, not a protocol failure, and
 * promoting it to a JSON-RPC error would tell a caller its request was malformed
 * when it was fine.
 */
async function surfaceProtocolErrors(response: Response): Promise<Response> {
  const type = response.headers.get('content-type') ?? ''
  // SSE bodies are streamed and must not be buffered or rewritten here.
  if (!type.includes('application/json')) return response

  const text = await response.clone().text()

  let payload: JsonRpcish | JsonRpcish[]
  try {
    payload = JSON.parse(text)
  } catch {
    return response
  }

  const convert = (message: JsonRpcish): JsonRpcish | Record<string, unknown> => {
    const result = message.result
    if (!result?.isError) return message

    const body = result.content?.find(part => part.type === 'text')?.text ?? ''
    const match = FOLDED_PROTOCOL_ERROR.exec(body.trim())
    if (!match) return message

    return {
      jsonrpc: '2.0',
      id: message.id ?? null,
      error: {
        code: Number(match[1]),
        message: match[2].trim(),
        data: {
          hint: 'Call tools/list for the available tools and their input schemas.',
        },
      },
    }
  }

  const converted = Array.isArray(payload) ? payload.map(convert) : convert(payload)
  if (JSON.stringify(converted) === text) return response

  // Headers are carried over so the rate-limit and CORS headers set upstream
  // survive the rewrite.
  return new Response(JSON.stringify(converted), {
    status: response.status,
    headers: response.headers,
  })
}

/**
 * Turns an `McpServer` into a Next.js route handler response.
 *
 * Stateless on purpose (`sessionIdGenerator: undefined`). The SDK's documented
 * production pattern keeps a `Map` of transports keyed by session id, which
 * needs the same process to answer every request in a session — and Vercel
 * serverless gives no such guarantee: the next request can land on a cold
 * instance with an empty Map, and every follow-up would 404 with "Session not
 * found". Stateless costs nothing here because none of Stride's tools carry
 * state between calls.
 *
 * A fresh server and transport per request is deliberate for the same reason:
 * module-scope instances would be shared across concurrent invocations on a
 * warm instance, and two agents' streams would interleave on one transport.
 */
export async function serveMcp(
  incoming: Request,
  build: () => McpServer,
  /**
   * Headers to merge onto the response — the RateLimit-* set, so an agent can
   * pace itself against the MCP endpoints rather than only against /ask.
   */
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const request = widenAccept(incoming)
  const server = build()
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    /**
     * Always JSON, never SSE. Do not make this adaptive — it was tried.
     *
     * The spec lets a server answer a POST either way, and answering with a
     * stream looks more "correct" on paper. It cannot work here, because the
     * `finally` below closes the transport as soon as `handleRequest` resolves —
     * and for an SSE response that is when the *headers* are ready, not when the
     * body is done. The stream gets torn down mid-flight and the client waits
     * until it times out. Verified with a real MCP client: JSON mode connects in
     * ~80ms, streaming mode hangs for the full 60s timeout.
     *
     * Keeping the per-request transport (which the comment above explains is
     * required on serverless) therefore means keeping JSON responses. That costs
     * nothing: every tool here returns in one shot, so there is no partial
     * output a stream would deliver sooner.
     */
    enableJsonResponse: true,
  })

  await server.connect(transport)

  try {
    const answered = await surfaceProtocolErrors(await transport.handleRequest(request))
    return withHeaders(answered, extraHeaders)
  } finally {
    // Releases the per-request transport. Without this each invocation leaks a
    // keep-alive timer on a warm instance.
    await transport.close().catch(() => {})
  }
}

/**
 * The 401 an agent gets for presenting a credential Stride cannot accept.
 *
 * Stride's MCP surface is anonymous — there is nothing to authenticate — but a
 * client that sends an `Authorization` header has clearly been told it needs
 * one, and the useful answer is the RFC 9728 pointer that explains it does not.
 * A bare 401 would leave it guessing; a silent 200 would leave it believing a
 * credential it invented was accepted.
 */
export function unauthorized(
  origin: string,
  headers: Record<string, string> = {},
): Response {
  return Response.json(
    {
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message:
          'Stride does not issue or accept credentials. Every tool on this server is read-only and anonymous — retry without an Authorization header. See /auth.md.',
      },
      id: null,
    },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${origin}${PROTECTED_RESOURCE_METADATA_PATH}"`,
        'Content-Type': 'application/json',
        ...headers,
      },
    },
  )
}

/** JSON tool result, in the shape hosts and plain HTTP clients both read. */
export function jsonResult(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value as Record<string, unknown>,
  }
}

/** Tool result for "asked for something that isn't there" — an error, not empty data. */
export function notFoundResult(message: string) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  }
}
