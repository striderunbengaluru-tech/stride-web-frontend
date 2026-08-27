import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { PROTECTED_RESOURCE_METADATA_PATH } from './discovery'

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
  request: Request,
  build: () => McpServer,
): Promise<Response> {
  const server = build()
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // JSON responses rather than an SSE stream for every call. Stride's tools
    // all return in one shot — there is nothing to stream — and a JSON body is
    // what a plain HTTP client can read without an EventSource.
    enableJsonResponse: true,
  })

  await server.connect(transport)

  try {
    return await transport.handleRequest(request)
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
export function unauthorized(origin: string): Response {
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
