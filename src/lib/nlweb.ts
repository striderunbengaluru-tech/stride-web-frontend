import { searchDocs, answerFaq, type DocResult } from '@/lib/mcp/docs'
import { listEvents, getEvent } from '@/lib/mcp/data'
import { sportsEventNode, organizationId } from '@/lib/json-ld'
import { BLOG_POSTS } from '@/content/blog/index'
import { ORIGINALS } from '@/content/originals'
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
    /** How many items were found before the limit was applied. */
    total: number
    sandbox: boolean
  }
  results: unknown[]
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

    case 'original': {
      const slug = result.id.replace('original:', '')
      const original = ORIGINALS[slug]
      return {
        '@context': 'https://schema.org',
        '@type': 'EventSeries',
        '@id': `${url}#series`,
        name: result.title,
        alternateName: original?.tagline,
        description: original?.description ?? result.summary,
        url,
        organizer: { '@id': organizationId(origin) },
        location: { '@type': 'City', name: 'Bengaluru' },
        encoding: { '@type': 'MediaObject', encodingFormat: 'text/markdown', contentUrl: `${url}.md` },
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
  opts: { limit?: number; sandbox?: boolean } = {},
): Promise<NlwebResponse> {
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const sandbox = opts.sandbox ?? false
  const results: unknown[] = []

  if (wantsEvents(query)) {
    const distance = requestedDistanceKm(query)
    const { events } = await listEvents(
      { when: 'upcoming', limit: Math.min(limit, 10), maxDistanceKm: distance },
      sandbox,
    )

    const details = await Promise.all(events.map(event => getEvent(event.slug, sandbox)))
    for (const detail of details) {
      if (detail) {
        results.push({ '@context': 'https://schema.org', ...sportsEventNode(origin, detail) })
      }
    }
  }

  const docs = searchDocs(query, { limit })
  for (const doc of docs) results.push(docToSchemaOrg(doc, origin))

  const total = results.length

  return {
    _meta: {
      response_type: 'items',
      version: NLWEB_VERSION,
      query,
      total,
      sandbox,
    },
    results: results.slice(0, limit),
  }
}
