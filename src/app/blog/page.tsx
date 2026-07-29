import type { Metadata } from 'next'
import { DEFAULT_OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from '@/lib/seo'
import { BLOG_POSTS } from '@/content/blog/index'
import { PostCard } from '@/components/blog/post-card'
import { Reveal } from '@/components/ui/reveal'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.strideclub.in'

const blogJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Stride Run Club Blog',
  description: 'Stories, run reports, and community moments from Stride Run Club Bengaluru.',
  url: `${SITE_URL}/blog`,
  publisher: {
    '@type': 'Organization',
    name: 'Stride Run Club',
    logo: {
      '@type': 'ImageObject',
      url: 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.svg',
    },
  },
  blogPost: BLOG_POSTS.map((p) => ({
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    url: `${SITE_URL}/blog/${p.slug}`,
    datePublished: p.publishedAt,
    image: p.coverUrl,
    author: { '@type': 'Person', name: p.author.name },
  })),
}

// The brand suffix comes from the root layout's title template, so it isn't
// repeated here — "Blog | Stride Run Club" rendered as
// "Blog | Stride Run Club | Stride Run Club". The openGraph block was also
// missing `url` and `images`, so shares of this page had no preview image and
// resolved their og:url to the site root.
export const metadata: Metadata = {
  title: 'Blog — Run Reports & Community Stories',
  description:
    'Stories, run reports and community moments from Stride Run Club Bengaluru. Real miles, real people, written by the crew who showed up.',
  keywords: ['Stride Run Club blog', 'running stories Bengaluru', 'run reports', 'running community blog India'],
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Stride Run Club',
    url: '/blog',
    title: 'Blog — Stride Run Club',
    description: 'Run reports, collabs and community moments. From the Stride crew to every athlete who shows up.',
    images: [{ url: DEFAULT_OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: 'Stride Run Club blog — run reports and community stories' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — Stride Run Club',
    description: 'Run reports, collabs and community moments from Stride Run Club Bengaluru.',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function BlogPage() {
  const [featured, ...rest] = BLOG_POSTS

  return (
    <main className='min-h-screen bg-stride-purple-primary pt-24 pb-24'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <div className='mx-auto max-w-6xl px-4 md:px-8'>

        {/* ── Header ── */}
        <Reveal className='mb-14 md:mb-20'>
          <h1 className='font-libre text-4xl md:text-6xl font-bold text-white leading-tight'>
            Stories that{' '}
            <span className='text-stride-yellow-accent'>move you.</span>
          </h1>
          <p className='mt-4 text-white/55 font-figtree text-base md:text-lg max-w-xl leading-relaxed'>
            Run reports, collabs, community moments. From the Stride crew to every athlete who shows up.
          </p>
        </Reveal>

        {/* ── Featured post ── */}
        {featured && (
          <Reveal className='mb-12'>
            <PostCard post={featured} featured />
          </Reveal>
        )}

        {/* ── All other posts ── */}
        {rest.length > 0 && (
          <>
            <Reveal className='mb-6'>
              <p className='text-xs font-mono uppercase tracking-[0.2em] text-white/30'>
                More stories
              </p>
            </Reveal>
            {/* `reveal-stagger` cascades cards that enter the viewport together
                — a scroll-timeline animation ignores animation-delay, so the
                stagger lives in animation-range offsets (globals.css). */}
            <div className='reveal-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'>
              {rest.map((post) => (
                <Reveal key={post.slug}>
                  <PostCard post={post} />
                </Reveal>
              ))}
            </div>
          </>
        )}

      </div>
    </main>
  )
}
