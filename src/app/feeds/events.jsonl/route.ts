import { getRequestOrigin } from '@/lib/site-url'
import { listEvents, getEvent } from '@/lib/mcp/data'
import { sportsEventNode } from '@/lib/json-ld'

/**
 * Every published Stride event as one schema.org `SportsEvent` per line.
 *
 * The NLWeb Schema Feeds format, declared by the `Schemamap:` directive in
 * robots.txt via /schemamap.xml. JSONL rather than one big array so a consumer
 * can stream it and stop when it has enough — and so a single malformed record
 * costs one line rather than the whole document.
 *
 * Detail is fetched per event so the offers carry real package prices. That is
 * one cached read per event; the feed is `s-maxage`d accordingly, and the
 * underlying reads are the same tagged ones the pages use.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const origin = getRequestOrigin(request)
  const { events } = await listEvents({ when: 'all', limit: 100 }, false)

  const details = await Promise.all(events.map(event => getEvent(event.slug, false)))

  const lines = details
    .filter((detail): detail is NonNullable<typeof detail> => detail !== null)
    .map(detail => JSON.stringify({ '@context': 'https://schema.org', ...sportsEventNode(origin, detail) }))

  return new Response(lines.join('\n') + (lines.length > 0 ? '\n' : ''), {
    headers: {
      'Content-Type': 'application/jsonl; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
      'Access-Control-Allow-Origin': '*',
      'X-Feed-Records': String(lines.length),
    },
  })
}
