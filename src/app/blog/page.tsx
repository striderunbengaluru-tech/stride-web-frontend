import type { Metadata } from 'next'
import { BLOG_POSTS } from '@/content/blog/index'
import { PostCard } from '@/components/blog/post-card'
import { SectionReveal } from '@/components/ui/section-reveal'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://stride-web-frontend.vercel.app'

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

export const metadata: Metadata = {
  title: 'Blog | Stride Run Club',
  description:
    'Stories, run reports, and community moments from Stride Run Club Bengaluru. Real miles, real people.',
  openGraph: {
    title: 'Blog | Stride Run Club',
    description:
      'Stories, run reports, and community moments from Stride Run Club Bengaluru.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — Stride Run Club',
    description:
      'Stories, run reports, and community moments from Stride Run Club Bengaluru.',
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
        <SectionReveal className='mb-14 md:mb-20'>
          <h1 className='font-libre text-4xl md:text-6xl font-bold text-white leading-tight'>
            Stories that{' '}
            <span className='text-stride-yellow-accent'>move you.</span>
          </h1>
          <p className='mt-4 text-white/55 font-figtree text-base md:text-lg max-w-xl leading-relaxed'>
            Run reports, collabs, community moments. From the Stride crew to every athlete who shows up.
          </p>
        </SectionReveal>

        {/* ── Featured post ── */}
        {featured && (
          <SectionReveal className='mb-12' delay={0.08}>
            <PostCard post={featured} featured />
          </SectionReveal>
        )}

        {/* ── All other posts ── */}
        {rest.length > 0 && (
          <>
            <SectionReveal className='mb-6' delay={0.1}>
              <p className='text-xs font-mono uppercase tracking-[0.2em] text-white/30'>
                More stories
              </p>
            </SectionReveal>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'>
              {rest.map((post, i) => (
                <SectionReveal key={post.slug} delay={0.06 + i * 0.06}>
                  <PostCard post={post} />
                </SectionReveal>
              ))}
            </div>
          </>
        )}

      </div>
    </main>
  )
}
