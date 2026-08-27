import { searchDocs, answerFaq, type DocResult } from '@/lib/mcp/docs'
import { listEvents, getEvent } from '@/lib/mcp/data'
import { sportsEventNode, organizationId } from '@/lib/json-ld'
import { BLOG_POSTS } from '@/content/blog/index'
import { LEAD_STRIDERS } from '@/content/lead-striders'

/**
 * Microsoft's NLWeb protocol, answered by retrieval rather than generation.
 *
 * NLWeb asks for schema.org items in reply to a natural-language question — it
 * does not ask for prose. That is the whole reason this needs no model: the
 * right answer to "upcoming 10k runs in Bengaluru" is the `SportsEvent` nodes,
 * and Stride already has them. No inference cost, no hallucination surface, and
 * an answer that is exactly as correct as the database.
 *
 * The retrieval itself reuses `searchDocs` from the documentation MCP server, so
 * `/ask` and `search_docs` can never rank the same corpus differently.
 */

export const NLWEB_VERSION = '0.1'

export type NlwebResponse = {
  _meta: {
    response_type: 'items'
    version: string
    query: string
    /** How many items matched in total, across every page. */
    total: number
    /** How many are in this page. */
    returned: number
    /**
     * Opaque cursor for the next page, or null at the end.
     *
     * This exists because the endpoint used to be quietly lossy: it computed
     * `total`, sliced to `limit`, and offered no way to reach the rest. A caller
     * could see `total: 12` next to eight results and had no move to make.
     */
    next_cursor: string | null
    sandbox: boolean
  }
  results: unknown[]
}

/**
 * Encodes a page position as an opaque cursor.
 *
 * Opaque on purpose. It happens to be a base64url offset today, and callers must
 * not decode it or synthesise one — that is what lets the pagination strategy
 * change later without breaking anyone. `decodeCursor` rejects anything it did
 * not produce rather than coercing it, so a hand-made cursor fails loudly.
 */
export function encodeCursor(offset: number): string {
  return Buffer.from(`o:${offset}`, 'utf8').toString('base64url')
}

export function decodeCursor(cursor: string): number | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8')
    const match = /^o:(\d+)$/.exec(decoded)
    if (!match) return null
    const offset = Number(match[1])
    return Number.isSafeInteger(offset) && offset >= 0 ? offset : null
  } catch {
    return null
  }
}

/** Terms that mean "show me events" rather than "tell me about Stride". */
const EVENT_INTENT = [
  'event', 'events', 'run', 'runs', 'race', 'races', 'when', 'upcoming',
  'this weekend', 'saturday', 'sunday', 'schedule', 'next', 'happening',
  '5k', '10k', 'half marathon', 'marathon', 'km', 'ticket', 'tickets',
  'register', 'registration', 'price', 'cost', 'free', 'paid',
]

function wantsEvents(query: string): boolean {
  const lower = query.toLowerCase()
  return EVENT_INTENT.some(term => lower.includes(term))
}

/** A pattern like "10k" or "21 km" in the query, as kilometres. */
function requestedDistanceKm(query: string): number | undefined {
  const match = query.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(?:k|km|kilometre|kilometer)s?\b/)
  if (!match) return undefined
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function docToSchemaOrg(result: DocResult, origin: string): unknown {
  const url = result.path ? `${origin}${result.path}` : origin

  switch (result.kind) {
    case 'blog': {
      const post = BLOG_POSTS.find(p => `blog:${p.slug}` === result.id)
      return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        '@id': `${url}#post`,
        headline: result.title,
        description: result.summary,
        url,
        datePublished: post?.publishedAt,
        keywords: post?.tags,
        author: post ? { '@type': 'Person', name: post.author.name, jobTitle: post.author.role } : undefined,
        publisher: { '@id': organizationId(origin) },
        // The markdown twin, so a consumer can fetch the body in one hop.
        encoding: { '@type': 'MediaObject', encodingFormat: 'text/markdown', contentUrl: `${url}.md` },
      }
    }

    case 'faq': {
      const entry = answerFaq(result.title)
      return {
        '@context': 'https://schema.org',
        '@type': 'Question',
        name: result.title,
        url: origin,
        acceptedAnswer: { '@type': 'Answer', text: entry?.answer ?? result.summary },
      }
    }

    case 'person': {
      const slug = result.id.replace('person:', '')
      const strider = LEAD_STRIDERS.find(s => s.slug === slug)
      return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': `${origin}/team#${slug}`,
        name: result.title,
        jobTitle: strider?.role || undefined,
        description: strider?.bio || undefined,
        memberOf: { '@id': organizationId(origin) },
        url: `${origin}/team#${slug}`,
        sameAs: [strider?.instagramUrl, strider?.stravaUrl].filter(Boolean),
      }
    }

    case 'page':
    default:
      return {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': url,
        name: result.title,
        description: result.summary,
        url,
        isPartOf: { '@id': `${origin}/#website` },
        encoding: {
          '@type': 'MediaObject',
          encodingFormat: 'text/markdown',
          contentUrl: result.path === '/' ? `${origin}/index.md` : `${url}.md`,
        },
      }
  }
}

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 25

/**
 * How many candidates are gathered before paging.
 *
 * The full result set is built once per request and then sliced, so `total` is
 * the same number on every page. Sizing the fetch by the requested page instead
 * made `total` grow as the caller paged — 3, then 5, then 7 — which is worse
 * than no total at all: a client using it to decide when to stop never would.
 */
const CANDIDATE_CEILING = 50

/**
 * Answers a query as schema.org items.
 *
 * Events lead when the question sounds like it is about events, because that is
 * what a run club is asked about; documents lead otherwise. Both are always
 * included — a question like "how much does the 10k cost" needs the event *and*
 * the pricing page, and guessing wrong about which one the asker meant is worse
 * than returning six items instead of three.
 */
export async function answerQuery(
  query: string,
  origin: string,
  opts: { limit?: number; sandbox?: boolean; offset?: number } = {},
): Promise<NlwebResponse> {
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(opts.offset ?? 0, 0)
  const sandbox = opts.sandbox ?? false
  const results: unknown[] = []

  if (wantsEvents(query)) {
    const distance = requestedDistanceKm(query)
    // The whole candidate set, not just this page — see CANDIDATE_CEILING.
    const { events } = await listEvents(
      { when: 'upcoming', limit: CANDIDATE_CEILING, maxDistanceKm: distance },
      sandbox,
    )

    const details = await Promise.all(events.map(event => getEvent(event.slug, sandbox)))
    for (const detail of details) {
      if (detail) {
        results.push({ '@context': 'https://schema.org', ...sportsEventNode(origin, detail) })
      }
    }
  }

  // Likewise the whole ranked set, so `total` does not depend on which page
  // was asked for.
  const docs = searchDocs(query, { limit: CANDIDATE_CEILING })
  for (const doc of docs) results.push(docToSchemaOrg(doc, origin))

  const total = results.length
  const page = results.slice(offset, offset + limit)
  const consumed = offset + page.length

  return {
    _meta: {
      response_type: 'items',
      version: NLWEB_VERSION,
      query,
      total,
      returned: page.length,
      next_cursor: consumed < total ? encodeCursor(consumed) : null,
      sandbox,
    },
    results: page,
  }
}
