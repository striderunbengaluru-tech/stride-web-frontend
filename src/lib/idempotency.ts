import { createHash } from 'crypto'

/**
 * `Idempotency-Key` replay for `/ask`.
 *
 * Why a read endpoint needs this at all: `/ask` is a POST that scans the whole
 * corpus and is rate limited. An agent whose connection drops mid-response has
 * no way to know whether the work happened, so it retries — and pays for the
 * scan twice, spending two of its sixty requests to get one answer. With a key,
 * the retry replays the stored response and costs nothing.
 *
 * The guarantee is deliberately narrow and stated as such on /developers: same
 * key plus same body replays the same bytes. There is no write to protect,
 * because Stride exposes none.
 *
 * ## The honest limitation
 *
 * This is per-instance, like the rate limiter, because Vercel gives serverless
 * invocations no shared memory. A retry that lands on a different instance
 * misses the cache and re-runs the query — which is safe (the endpoint has no
 * side effects) but not free. Making it global needs a shared store this project
 * does not have. Since the worst case is "the retry costs what the original
 * cost", that trade is fine here; it would not be for a payment.
 *
 * The body is hashed into the cache key, so reusing one key with a different
 * question is a miss rather than a wrong answer served confidently.
 */

type Entry = { response: string; expiresAt: number }

const cache = new Map<string, Entry>()

/** Long enough to cover a client's retry window, short enough to stay small. */
const TTL_MS = 10 * 60 * 1000
const MAX_ENTRIES = 500

function cacheKey(key: string, body: string): string {
  const fingerprint = createHash('sha256').update(body).digest('base64url').slice(0, 22)
  return `${key}:${fingerprint}`
}

function evictExpired(now: number): void {
  for (const [k, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(k)
  }
}

/** The stored response for this key and body, or null. */
export function replayIdempotent(key: string, body: string): string | null {
  const now = Date.now()
  const entry = cache.get(cacheKey(key, body))
  if (!entry) return null
  if (entry.expiresAt <= now) {
    cache.delete(cacheKey(key, body))
    return null
  }
  return entry.response
}

export function recordIdempotent(key: string, body: string, response: string): void {
  const now = Date.now()

  if (cache.size >= MAX_ENTRIES) {
    evictExpired(now)
    // Still full: every entry is live. Drop the oldest rather than grow without
    // bound — losing a replay only costs a re-run, which is safe here.
    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
  }

  cache.set(cacheKey(key, body), { response, expiresAt: now + TTL_MS })
}
