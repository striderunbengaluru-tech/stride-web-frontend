import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ORIGINALS, ORIGINALS_LIST } from '@/content/originals'
import { HighlightedText } from '@/components/ui/highlighted-text'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return ORIGINALS_LIST.map((o) => ({ slug: o.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const original = ORIGINALS[slug]
  if (!original) return {}
  return {
    title: `${original.title} — Stride Run Club`,
    description: original.description,
  }
}

export default async function OriginalsPage({ params }: Props) {
  const { slug } = await params
  const original = ORIGINALS[slug]

  if (!original) notFound()

  const { title, tagline, heroLabel, description, longDescription, highlights, quote, quoteAuthor, ctaLabel, ctaHref } = original

  return (
    <div className='min-h-screen'>

      {/* Back nav */}
      <div className='px-6 pt-28 pb-4 max-w-5xl mx-auto'>
        <Link
          href='/'
          className='inline-flex items-center gap-2 text-copy-white/50 hover:text-copy-white text-sm transition-colors duration-150'
        >
          <ArrowLeft className='size-4' />
          Back to home
        </Link>
      </div>

      {/* Hero */}
      <section className='px-6 py-10 md:py-16 max-w-5xl mx-auto'>
        <span className='inline-block text-xs font-mono uppercase tracking-widest text-stride-yellow-accent font-medium mb-6 px-3 py-1 rounded-full border border-stride-yellow-accent/30 bg-stride-yellow-accent/10'>
          {heroLabel}
        </span>
        <h1 className='text-4xl md:text-6xl lg:text-7xl font-bold font-libre text-copy-white mb-4 leading-tight'>
          {title}
        </h1>
        <p className='text-xl md:text-2xl text-stride-yellow-accent font-medium mb-8'>
          {tagline}
        </p>
        <p className='text-copy-white/70 text-lg md:text-xl max-w-2xl leading-relaxed'>
          {description}
        </p>
      </section>

      {/* Highlights grid */}
      <section className='px-6 py-8 max-w-5xl mx-auto'>
        <div className='grid grid-cols-3 gap-4 md:gap-6'>
          {highlights.map(({ label, value }) => (
            <div
              key={label}
              className='bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-5 py-6 text-center'
            >
              <p className='text-2xl md:text-3xl font-bold font-libre text-stride-yellow-accent mb-1'>
                {value}
              </p>
              <p className='text-copy-white/50 text-xs font-mono uppercase tracking-wide'>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Long description */}
      <section className='px-6 py-10 max-w-3xl mx-auto'>
        <p className='text-copy-white/80 text-lg md:text-xl leading-relaxed'>
          {longDescription}
        </p>
      </section>

      {/* Pull quote */}
      <section className='px-6 py-10 max-w-5xl mx-auto'>
        <div className='bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-8 py-10 md:px-12'>
          <p className='text-xl md:text-2xl font-libre italic text-copy-white leading-relaxed mb-4'>
            &ldquo;{quote}&rdquo;
          </p>
          <p className='text-copy-white/50 text-sm'>— {quoteAuthor}</p>
        </div>
      </section>

      {/* Other originals */}
      <section className='px-6 py-10 max-w-5xl mx-auto'>
        <p className='text-xs font-mono uppercase tracking-widest text-copy-white/40 font-medium mb-6'>
          More Originals
        </p>
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
          {ORIGINALS_LIST.filter((o) => o.slug !== slug).map((o) => (
            <Link
              key={o.slug}
              href={`/originals/${o.slug}`}
              className='group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-stride-yellow-accent/30 rounded-xl px-5 py-5 transition-all duration-200'
            >
              <p className='text-copy-white font-semibold mb-1 group-hover:text-stride-yellow-accent transition-colors duration-150'>
                {o.title}
              </p>
              <p className='text-copy-white/50 text-sm line-clamp-2'>{o.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className='px-6 py-14 md:py-20 max-w-3xl mx-auto text-center'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-4'>
          <HighlightedText text='Be **part of it.**' />
        </h2>
        <p className='text-copy-white/60 mb-8'>
          Follow us on Instagram to catch the next one.
        </p>
        <a
          href={ctaHref}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-2 bg-stride-yellow-accent text-copy-black font-bold px-8 py-3.5 rounded-md hover:opacity-90 transition-opacity'
        >
          {ctaLabel}
          <ArrowRight className='size-4' />
        </a>
      </section>

    </div>
  )
}
