import { getRequestOrigin } from '@/lib/site-url'
import { guardRate, READ_LIMIT } from '@/lib/rate-limit'
import { BLOG_POSTS } from '@/content/blog/index'
import { organizationId } from '@/lib/json-ld'
import { markdownToPlainText } from '@/lib/utils/markdown-text'

/**
 * Every blog post as one schema.org `BlogPosting` per line.
 *
 * `articleBody` carries the whole post, flattened out of markdown — the same
 * treatment the post page's own JSON-LD gives it. A feed of titles and links
 * would just be the sitemap again; the point of this one is that an assistant
 * can answer from the text without a second fetch per post.
 */

export const dynamic = 'force-static'

export function GET(request: Request): Response {
  const origin = getRequestOrigin(request)
  const rate = guardRate(request, READ_LIMIT, `${origin}/developers`)
  if (rate.limited) return rate.limited

  const lines = [...BLOG_POSTS]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map(post =>
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        '@id': `${origin}/blog/${post.slug}#post`,
        headline: post.title,
        description: post.description,
        url: `${origin}/blog/${post.slug}`,
        mainEntityOfPage: `${origin}/blog/${post.slug}`,
        datePublished: post.publishedAt,
        dateModified: post.publishedAt,
        image: post.ogImageUrl ?? post.coverUrl,
        keywords: post.tags,
        wordCount: markdownToPlainText(post.content).split(/\s+/).filter(Boolean).length,
        timeRequired: `PT${post.readingTimeMin}M`,
        author: {
          '@type': 'Person',
          name: post.author.name,
          jobTitle: post.author.role,
          ...(post.author.instagramUrl ? { sameAs: [post.author.instagramUrl] } : {}),
        },
        publisher: { '@id': organizationId(origin) },
        inLanguage: 'en-IN',
        articleBody: markdownToPlainText(post.content),
        alternateName: `${origin}/blog/${post.slug}.md`,
      }),
    )

  return new Response(lines.join('\n') + (lines.length > 0 ? '\n' : ''), {
    headers: {
      'Content-Type': 'application/jsonl; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      'X-Feed-Records': String(lines.length),
      ...rate.headers,
    },
  })
}
