import { PRODUCTION_SITE_URL } from '@/lib/site-url'

/**
 * One JSON error shape for every public endpoint.
 *
 * Two things were wrong before this existed. `/ask` returned a JSON error with
 * a human sentence but no machine-readable code, so a client had to string-match
 * the prose to tell "query too long" from "bad JSON". And every unmatched path
 * under an API prefix — `/ask/foo`, `/api/v1/events`, `/mcp/nope`,
 * `/feeds/bogus.jsonl` — fell through to the HTML not-found page. An agent
 * probing the API got a 53 KB React document with a duck on it.
 *
 * The body follows RFC 9457 (Problem Details for HTTP APIs), served as
 * `application/problem+json`, with three additions that matter to a
 * non-human caller:
 *
 *   `code`  a stable enum to branch on, so nobody parses `detail`
 *   `hint`  what to do about it, in one sentence
 *   `documentation` where the rule is written down
 *
 * `type` is a URL under /developers rather than `about:blank`, so following it
 * lands somewhere that explains the error class.
 */

export const ERROR_CODES = {
  invalid_request: 'invalid_request',
  invalid_query: 'invalid_query',
  query_too_long: 'query_too_long',
  not_found: 'not_found',
  method_not_allowed: 'method_not_allowed',
  rate_limited: 'rate_limited',
  unsupported_credential: 'unsupported_credential',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export type ProblemOptions = {
  status: number
  code: ErrorCode
  title: string
  detail: string
  hint: string
  /** Absolute origin for the doc links. Defaults to the canonical site. */
  origin?: string
  /** Extra machine-readable members. RFC 9457 allows arbitrary extensions. */
  extra?: Record<string, unknown>
  headers?: Record<string, string>
}

export function problem(options: ProblemOptions): Response {
  const origin = options.origin ?? PRODUCTION_SITE_URL

  const body = {
    type: `${origin}/developers#error-${options.code.replace(/_/g, '-')}`,
    title: options.title,
    status: options.status,
    code: options.code,
    detail: options.detail,
    hint: options.hint,
    documentation: `${origin}/developers`,
    ...options.extra,
  }

  return new Response(JSON.stringify(body, null, 2), {
    status: options.status,
    headers: {
      // RFC 9457's media type. Every JSON parser reads it as JSON, and a client
      // that understands problem+json gets the stronger signal.
      'Content-Type': 'application/problem+json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      ...options.headers,
    },
  })
}

/**
 * The 404 for an unmatched path under an API prefix.
 *
 * `available` lists the endpoints that DO exist under that prefix, because the
 * most likely reason an agent is here is a wrong path rather than a wrong idea —
 * and a 404 that names the alternatives saves it a round of guessing.
 */
export function notFoundProblem(
  origin: string,
  pathname: string,
  available: string[],
  headers: Record<string, string> = {},
): Response {
  return problem({
    status: 404,
    code: ERROR_CODES.not_found,
    title: 'No such endpoint',
    detail: `Nothing is served at ${pathname}.`,
    hint:
      available.length > 0
        ? `Try one of the endpoints listed in "available", or read ${origin}/developers.`
        : `Read ${origin}/developers for the full list of endpoints.`,
    origin,
    extra: {
      instance: pathname,
      available: available.map(path => `${origin}${path}`),
      catalog: `${origin}/.well-known/api-catalog`,
      openapi: `${origin}/openapi.json`,
    },
    headers,
  })
}

/** `405` with the `Allow` header the status requires. */
export function methodNotAllowedProblem(
  origin: string,
  pathname: string,
  allowed: string[],
): Response {
  return problem({
    status: 405,
    code: ERROR_CODES.method_not_allowed,
    title: 'Method not allowed',
    detail: `${pathname} does not accept that HTTP method.`,
    hint: `Use one of: ${allowed.join(', ')}.`,
    origin,
    extra: { instance: pathname, allow: allowed },
    headers: { Allow: allowed.join(', ') },
  })
}
