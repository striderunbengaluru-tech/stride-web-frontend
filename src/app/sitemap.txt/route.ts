import { buildSitemapEntries } from '@/lib/sitemap-entries'

// Plain-text sitemap (https://www.strideclub.in/sitemap.txt) — one absolute URL
// per line, UTF-8. Google Search Console accepts this format. Mirrors the XML
// sitemap exactly via the shared builder, including production route gating.
export async function GET(): Promise<Response> {
  const entries = await buildSitemapEntries()
  const body = entries.map(entry => entry.url).join('\n') + '\n'

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
