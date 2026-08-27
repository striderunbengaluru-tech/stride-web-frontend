/**
 * Best-effort rate limiting for the public read endpoints.
 *
 * **Read this before relying on it.** Vercel serverless gives no shared memory
 * between invocations, so this counts requests per *instance*, not globally. A
 * caller spread across cold starts gets a higher effective ceiling than the
 * numbers below suggest, and two concurrent instances each allow a full budget.
 *
 * That makes it a guard against the failure this is actually likely to see — a
 * single client in a runaway loop hitting one warm instance — and not a defence
 * against a distributed attacker. Doing better needs shared state (Vercel KV,
 * Upstash) or the platform firewall, neither of which is configured here. The
 * honest position is documented in /auth.md and on /developers rather than
 * implied to be stronger than it is.
 *
 * It exists at all because /auth.md documents a 429, and a documented response
 * that can never fire is worse than no documentation.
 */

type Bucket = { count: number; resetAt: number }

/**
 * Module scope, so it survives between invocations on one warm instance and
 * resets on a cold start. Capped, because an unbounded map keyed by client
 * address is itself a memory-exhaustion vector.
 */
const buckets = new Map<string, Bucket>()
const MAX_TRACKED_CLIENTS = 5_000

export type RateLimitConfig = {
  /** Requests allowed per window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

/** Generous: these are cached reads over public data, not writes. */
export const READ_LIMIT: RateLimitConfig = { limit: 120, windowMs: 60_000 }

/** Tighter: /ask scans the whole corpus per call, so it costs more per request. */
export const ASK_LIMIT: RateLimitConfig = { limit: 60, windowMs: 60_000 }

/**
 * The caller's address, as far as it can be known.
 *
 * `x-forwarded-for` is a client-settable header, so this is spoofable — which is
 * another reason the limiter above is a guard and not a control. On Vercel the
 * left-most entry is the real client address because the platform rewrites the
 * header, so this is accurate for honest callers, which is who it is protecting
 * the budget from.
 */
function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export type RateLimitResult = {
  ok: boolean
  limit: number
  remaining: number
  /** Unix seconds when the current window ends. */
  resetAt: number
  retryAfterSeconds: number
  /** Window length in seconds, for the `RateLimit-Policy` header. */
  windowSeconds: number
}

export function checkRateLimit(request: Request, config: RateLimitConfig): RateLimitResult {
  const key = clientKey(request)
  const now = Date.now()

  // Evict expired entries before the size check, so a steady stream of distinct
  // callers cannot fill the map with buckets that are already stale.
  if (buckets.size >= MAX_TRACKED_CLIENTS) {
    for (const [k, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(k)
    }
    // Still full: every bucket is live. Drop the whole map rather than start
    // rejecting legitimate traffic — losing the counts fails open, which is the
    // right direction for a guard on public read endpoints.
    if (buckets.size >= MAX_TRACKED_CLIENTS) buckets.clear()
  }

  const existing = buckets.get(key)
  const bucket = existing && existing.resetAt > now
    ? existing
    : { count: 0, resetAt: now + config.windowMs }

  bucket.count += 1
  buckets.set(key, bucket)

  const remaining = Math.max(config.limit - bucket.count, 0)
  const retryAfterSeconds = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1)

  return {
    ok: bucket.count <= config.limit,
    limit: config.limit,
    remaining,
    resetAt: Math.ceil(bucket.resetAt / 1000),
    retryAfterSeconds,
    windowSeconds: Math.round(config.windowMs / 1000),
  }
}

/** The standard headers, so a caller can pace itself instead of discovering the limit. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(result.resetAt),
    // The policy, so a client knows the window and not just the count left.
    'RateLimit-Policy': `${result.limit};w=${result.windowSeconds}`,
  }
}

/**
 * Check the limit and get the headers in one call.
 *
 * Every public endpoint uses this, including the ones that only ever return
 * documents. That is the point: the headers used to ride only on `/ask`'s
 * successful JSON, so `GET /ask` with no query, `/openapi.json`, the feeds, the
 * JSON 404s, the 400s and the 401 all answered with no budget information at
 * all. An agent learning its remaining quota from the success path but not the
 * failure path has it exactly backwards — the failure is when it most needs to
 * know whether to back off.
 *
 * Returns a ready 429 when the limit is exceeded, otherwise the headers to merge
 * into whatever the route was going to send.
 */
export function guardRate(
  request: Request,
  config: RateLimitConfig,
  docsUrl: string,
): { limited: Response; headers?: never } | { limited?: never; headers: Record<string, string> } {
  const result = checkRateLimit(request, config)
  if (!result.ok) return { limited: tooManyRequests(result, docsUrl) }
  return { headers: rateLimitHeaders(result) }
}

/** The 429 itself, shaped so both a person and a program can read it. */
export function tooManyRequests(result: RateLimitResult, docsUrl: string): Response {
  return Response.json(
    {
      error: 'rate_limited',
      message: `Too many requests. The limit is ${result.limit} per minute per client. Retry in ${result.retryAfterSeconds}s.`,
      retryAfterSeconds: result.retryAfterSeconds,
      documentation: docsUrl,
    },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        'Retry-After': String(result.retryAfterSeconds),
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}
