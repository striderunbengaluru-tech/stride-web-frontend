import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BLOG_POSTS } from '@/content/blog/index'
import { ReadingProgress } from '@/components/blog/reading-progress'
import { AuthorCard } from '@/components/blog/author-card'
import { TldrBlock } from '@/components/blog/tldr-block'
import { MdRenderer } from '@/components/blog/md-renderer'

type Props = {
  params: Promise<{ slug: string }>
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = BLOG_POSTS.find((p) => p.slug === slug)
  if (!post) return {}

  return {
    title: `${post.title} | Stride Run Club`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.publishedAt,
      images: [{ url: post.ogImageUrl ?? post.coverUrl, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [post.ogImageUrl ?? post.coverUrl],
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = BLOG_POSTS.find((p) => p.slug === slug)
  if (!post) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://stride-web-frontend.vercel.app'
  const postUrl = `${siteUrl}/blog/${post.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    headline: post.title,
    description: post.description,
    image: { '@type': 'ImageObject', url: post.ogImageUrl ?? post.coverUrl, width: 1200, height: 630 },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author.name,
      ...(post.author.avatarUrl ? { image: post.author.avatarUrl } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Stride Run Club',
      logo: {
        '@type': 'ImageObject',
        url: 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.svg',
      },
    },
    url: postUrl,
    keywords: post.tags.join(', '),
  }

  return (
    <>
      <ReadingProgress />

      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className='min-h-screen bg-stride-purple-primary pt-20 md:pt-24 pb-24'>
        <div className='mx-auto max-w-6xl px-4 md:px-8'>

          {/* ── Back nav ── */}
          <div className='mb-10'>
            <Link
              href='/blog'
              className='inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white font-figtree transition-colors duration-150 cursor-pointer'
            >
              <ArrowLeft className='w-3.5 h-3.5' />
              Blog Hub
            </Link>
          </div>

          {/* ── Header: tags, date, title ── */}
          <div className='mb-8'>
            {/* Tags */}
            <div className='flex items-center gap-1.5 mb-5 flex-wrap'>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className='text-xs bg-stride-yellow-accent/10 text-stride-yellow-accent rounded-full px-2.5 py-0.5 border border-stride-yellow-accent/20 font-figtree'
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Date */}
            <p className='text-sm text-white/40 font-figtree mb-4 tracking-wide'>
              {formatDate(post.publishedAt)}
            </p>

            {/* Title */}
            <h1 className='font-libre text-3xl md:text-5xl font-bold text-white leading-tight'>
              {post.title}
            </h1>
          </div>

          {/* ── Hero image ── */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverUrl}
            alt={post.title}
            className='w-full h-auto md:w-auto md:max-w-full md:max-h-[520px] rounded-md shadow-xl block mx-auto mb-8'
            loading='eager'
          />

          {/* ── Author strip ── */}
          <div className='pb-8 border-b border-white/10'>
            <AuthorCard
              author={post.author}
              publishedAt={post.publishedAt}
              readingTimeMin={post.readingTimeMin}
            />
          </div>

          {/* ── Description ── */}
          <p className='mt-8 text-white/60 font-figtree text-lg leading-relaxed'>
            {post.description}
          </p>

          {/* ── TL;DR ── */}
          <TldrBlock bullets={post.tldr} />

          {/* ── Markdown content ── */}
          <MdRenderer content={post.content} />

          {/* ── End CTA ── */}
          <div className='mt-16 pt-12 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6'>
            <div>
              <p className='text-xs font-mono uppercase tracking-[0.2em] text-stride-yellow-accent mb-1'>
                Run with us
              </p>
              <p className='font-libre text-2xl font-bold text-white'>
                Be part of the next story.
              </p>
            </div>
            <Link
              href='https://www.instagram.com/stride_runclub_bengaluru/'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 bg-stride-yellow-accent text-copy-black font-semibold text-sm px-6 py-3 rounded-md hover:bg-stride-yellow-accent/90 transition-colors font-figtree shrink-0'
            >
              See upcoming runs
            </Link>
          </div>

        </div>
      </main>
    </>
  )
}
