import { getRequestOrigin } from '@/lib/site-url'
import { guardRate, READ_LIMIT } from '@/lib/rate-limit'
import { listRaces, getRace } from '@/lib/mcp/data'
import { raceEventNode } from '@/lib/json-ld'

/**
 * Every published race on the calendar as one schema.org `SportsEvent` per
 * line — the sibling of /feeds/events.jsonl, declared alongside it in
 * /schemamap.xml. Same shape, same caching; the nodes name the real organiser
 * rather than Stride, because Stride only curates these.
 */

export const dynamic = 'force-dynamic'

const FEED_LIMIT = 100

export async function GET(request: Request): Promise<Response> {
  const origin = getRequestOrigin(request)
  const rate = guardRate(request, READ_LIMIT, `${origin}/developers`)
  if (rate.limited) return rate.limited
  const { races } = await listRaces({ when: 'all', limit: FEED_LIMIT }, false)

  const details = await Promise.all(races.map(race => getRace(race.slug, false)))

  const lines = details
    .filter((detail): detail is NonNullable<typeof detail> => detail !== null)
    .map(detail => JSON.stringify({ '@context': 'https://schema.org', ...raceEventNode(origin, detail) }))

  return new Response(lines.join('\n') + (lines.length > 0 ? '\n' : ''), {
    headers: {
      'Content-Type': 'application/jsonl; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
      'Access-Control-Allow-Origin': '*',
      'X-Feed-Records': String(lines.length),
      ...rate.headers,
    },
  })
}
