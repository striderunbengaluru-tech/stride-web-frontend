/**
 * Content negotiation for `Accept: text/markdown`.
 *
 * Agents that ask for markdown get markdown; browsers keep getting HTML. Shared
 * by the middleware (which decides whether to rewrite) and the /md route
 * handler (which renders), so the two can never disagree about what is
 * negotiable.
 */

export const MARKDOWN_MEDIA_TYPE = 'text/markdown'

/** Where the middleware rewrites a negotiated request. Not linked anywhere. */
export const MARKDOWN_ROUTE_PREFIX = '/md'

type MediaRange = { type: string; q: number }

/**
 * Parses an Accept header into media ranges with their q-values.
 *
 * Malformed parameters are ignored rather than throwing — a header is
 * attacker-controlled input and a bad q must not take down the request.
 */
function parseAccept(header: string): MediaRange[] {
  return header
    .split(',')
    .map(part => {
      const [rawType, ...params] = part.split(';')
      const type = rawType.trim().toLowerCase()
      if (!type) return null

      let q = 1
      for (const param of params) {
        const [key, value] = param.split('=')
        if (key?.trim().toLowerCase() !== 'q') continue
        const parsed = Number.parseFloat(value ?? '')
        if (Number.isFinite(parsed)) q = Math.min(Math.max(parsed, 0), 1)
      }

      return { type, q }
    })
    .filter((r): r is MediaRange => r !== null)
}

/**
 * True only when the client has *explicitly* asked for markdown and wants it at
 * least as much as HTML.
 *
 * The explicit part is the whole point. Every browser sends
 * `text/html,application/xhtml+xml,application/xml;q=0.9,*​/*;q=0.8` — a
 * wildcard that technically matches text/markdown. Honouring `*​/*` here would
 * serve raw markdown to every human visitor. So wildcards are ignored entirely
 * for the markdown side, and a tie goes to markdown only because a client that
 * bothered to name it meant it.
 */
export function prefersMarkdown(acceptHeader: string | null): boolean {
  if (!acceptHeader) return false

  const ranges = parseAccept(acceptHeader)
  const markdown = ranges.find(r => r.type === MARKDOWN_MEDIA_TYPE)
  if (!markdown || markdown.q === 0) return false

  // Compared against html's exact q only. `*/*` is deliberately not consulted:
  // it says "anything is fine", which is not a preference for HTML.
  const html = ranges.find(r => r.type === 'text/html')
  return markdown.q >= (html?.q ?? 0)
}

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
