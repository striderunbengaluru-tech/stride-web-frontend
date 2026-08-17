/**
 * Content negotiation for `Accept: text/markdown`.
 *
 * Agents that ask for markdown get markdown; browsers keep getting HTML.
 *
 * The *routing* half of this lives in `rewrites()` in next.config.ts, which
 * matches the Accept header at the edge and rewrites to `/md/<path>` without
 * invoking a function. It used to live in middleware, and forcing the
 * middleware matcher to cover every public page for it was the single largest
 * consumer of the project's compute budget.
 *
 * What remains here is the authority on *what* is negotiable, used by the
 * `/md/[[...slug]]` handler itself. Keeping the check in the handler is what
 * makes the routing-layer list safe to be a convenience rather than a
 * security boundary: the route is publicly reachable either way, so it must
 * decide for itself what it is willing to render.
 *
 * One behavioural note on the move. The old middleware parsed Accept q-values
 * and served markdown only when it was preferred at least as strongly as HTML.
 * The routing layer matches the literal string `text/markdown` instead, so a
 * client that names markdown at a *lower* q than HTML now receives markdown.
 * Browsers are unaffected — they never name markdown at all, only `*​/*` — so
 * this only changes the answer for agents that explicitly asked for it and
 * then ranked it last.
 */

/**
 * Paths with a markdown representation worth serving.
 *
 * A deliberate allowlist, not a catch-all. Two reasons: a path with no markdown
 * source must fall through to HTML (that is correct negotiation — Accept is a
 * preference, and a server may answer with what it has), and scraping React
 * marketing pages into markdown would emit nav and footer chrome as content.
 *
 * Everything here is public. Nothing under /admin, /api, /profile, /my-runs or
 * an event confirmation is negotiable — those are authenticated or per-user,
 * and a second representation is a second surface to get authorization wrong on.
 *
 * Kept in lockstep with MARKDOWN_NEGOTIABLE_PATHS in next.config.ts. This
 * function is the stricter of the two and the one that actually gates output.
 */
export function isNegotiablePath(pathname: string): boolean {
  const path = pathname !== '/' && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname

  if (path === '/' || path === '/blog' || path === '/events') return true
  if (path === '/privacy-policy' || path === '/terms-of-service') return true

  // One level deep only — /events/<slug>, never /events/<slug>/confirmation/<id>.
  const blog = /^\/blog\/[^/]+$/.test(path)
  const event = /^\/events\/[^/]+$/.test(path)
  return blog || event
}

/**
 * Rough token count for `X-Markdown-Tokens`, at the usual ~4 characters per
 * token. Advertised as an estimate because it is one — it lets an agent budget
 * a fetch without tokenising, and no caller should treat it as exact.
 */
export function estimateTokens(markdown: string): number {
  return Math.ceil(markdown.length / 4)
}
