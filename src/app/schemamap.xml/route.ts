import { getRequestOrigin } from '@/lib/site-url'

/**
 * The NLWeb Schema Map — where Stride's structured data feeds live.
 *
 * Declared from robots.txt with `Schemamap:`, alongside the two `Sitemap:`
 * lines. A sitemap says which URLs exist; this says which of them are machine
 * data rather than pages, and what type each one carries.
 *
 * Hand-built XML rather than a library: it is three entries with no user input
 * in them, and the escaping surface is a handful of absolute URLs we generate.
 */

export const dynamic = 'force-dynamic'

type Feed = {
  path: string
  type: string
  schemaType: string
  description: string
}

const FEEDS: Feed[] = [
  {
    path: '/feeds/events.jsonl',
    type: 'application/jsonl',
    schemaType: 'https://schema.org/SportsEvent',
    description: 'Every published Stride Run Club event, one SportsEvent per line, with offers priced in INR.',
  },
  {
    path: '/feeds/blog.jsonl',
    type: 'application/jsonl',
    schemaType: 'https://schema.org/BlogPosting',
    description: 'Every Stride Run Club blog post, one BlogPosting per line, including the full article body.',
  },
]

export function GET(request: Request): Response {
  const origin = getRequestOrigin(request)

  const entries = FEEDS.map(feed => `  <schema>
    <loc>${origin}${feed.path}</loc>
    <type>${feed.type}</type>
    <schemaType>${feed.schemaType}</schemaType>
    <description>${feed.description}</description>
  </schema>`).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<schemamap xmlns="https://schemamap.org/schemas/1.0">
${entries}
</schemamap>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
