import { estimateTokens, frontmatter, isNegotiablePath } from '@/lib/markdown-negotiation'
import { renderMarkdownPath } from '@/lib/markdown/render'
import { getRequestOrigin } from '@/lib/site-url'
import { guardRate, READ_LIMIT } from '@/lib/rate-limit'

/**
 * The markdown half of Stride's markdown representation.
 *
 * Never linked and never navigated to directly. Three things route here, all in
 * `rewrites()` in next.config.ts so none of them costs a function invocation
 * for the routing decision itself:
 *
 *   1. `Accept: text/markdown` — content negotiation
 *   2. a `.md` URL suffix — `/events/summer-10k.md`
 *   3. a known AI-bot user agent — GPTBot, ClaudeBot, PerplexityBot, …
 *
 * In all three the URL the agent sees stays the real one.
 *
 * The documents themselves live in @/lib/markdown/render, shared with the
 * documentation MCP server so the two can never drift. What stays here is the
 * HTTP shape: the authorization check, frontmatter, caching headers, and the
 * markdown 404.
 */

/** Recovery body for a path with no markdown twin — a dead end is still a 404. */
function notFoundMarkdown(origin: string): string {
  return [
    '# 404 — Not Found',
    '',
    'No Stride page exists at that path.',
    '',
    '## Where to look instead',
    '',
    `- [All URLs (sitemap)](${origin}/sitemap.txt)`,
    `- [Structured site index](${origin}/llms.txt)`,
    `- [Events](${origin}/events.md) — every upcoming run and race`,
    `- [Pricing](${origin}/pricing.md) — membership is free`,
    `- [Home](${origin}/index.md)`,
    '',
    'Any page can be fetched as markdown by appending `.md` to its path.',
    '',
  ].join('\n')
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug?: string[] }> },
): Promise<Response> {
  const { slug } = await ctx.params
  const pathname = '/' + (slug ?? []).join('/')
  const origin = getRequestOrigin(request)
  const rate = guardRate(request, READ_LIMIT, `${origin}/developers`)
  if (rate.limited) return rate.limited

  const abs = (path: string) => `${origin}${path}`

  // Checked here rather than trusted from the rewrite: this route is publicly
  // reachable, and the allowlist is what keeps it from becoming a second way to
  // read something the HTML side gates.
  const doc = isNegotiablePath(pathname)
    ? await renderMarkdownPath(pathname, abs)
    : null

  if (doc === null) {
    return new Response(notFoundMarkdown(origin), {
      status: 404,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept, User-Agent',
        'Cache-Control': 'public, max-age=0, s-maxage=60',
        ...rate.headers,
      },
    })
  }

  const canonical = abs(pathname === '/' ? '/' : pathname)
  const body = frontmatter({
    title: doc.title,
    description: doc.description,
    canonical,
  }) + doc.body

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      // Without this a shared cache would happily hand an agent's markdown to
      // the next browser that asked for the same URL. `User-Agent` is in there
      // because bot-UA serving varies the representation by UA too.
      'Vary': 'Accept, User-Agent',
      // Satisfies the canonical slot for agents that read headers over
      // frontmatter, and points a `.md` URL back at the real page.
      'Link': `<${canonical}>; rel="canonical"`,
      'X-Markdown-Tokens': String(estimateTokens(body)),
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      ...rate.headers,
    },
  })
}
