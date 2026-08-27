import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ORIGINALS_LIST } from '@/content/originals'
import { HighlightedText } from '@/components/ui/highlighted-text'
import type { Metadata } from 'next'

/**
 * The Originals index.
 *
 * Both `public/llms.txt` and the sitemap have advertised `/originals` since they
 * were written, but only `/originals/[slug]` existed — so the one path an agent
 * or crawler was told to start from returned a 404. This is that page.
 */

export const metadata: Metadata = {
  title: 'Stride Originals',
  description:
    "Stride's own running formats — the Lake Hop Project, Stride Like a Woman, the Creator Program and the Bakery Hop Run. Four formats built in Bengaluru, run by the community.",
  alternates: {
    canonical: '/originals',
    types: { 'text/markdown': '/originals.md' },
  },
}

export default function OriginalsIndexPage() {
  return (
    <div className='min-h-screen'>
      <section className='px-6 pt-28 pb-10 md:pb-16 max-w-5xl mx-auto'>
        <span className='inline-block text-xs font-mono uppercase tracking-widest text-stride-yellow-accent font-medium mb-6 px-3 py-1 rounded-full border border-stride-yellow-accent/30 bg-stride-yellow-accent/10'>
          Stride Originals
        </span>
        <h1 className='text-4xl md:text-6xl lg:text-7xl font-bold font-libre text-copy-white mb-4 leading-tight'>
          <HighlightedText text='Formats we **made ourselves.**' />
        </h1>
        <p className='text-copy-white/70 text-lg md:text-xl max-w-2xl leading-relaxed'>
          Not every run is a distance and a start time. These are the formats Stride
          built from scratch in Bengaluru — some monthly, some annual, one invite-only.
          Each one started as an experiment and stuck.
        </p>
      </section>

      <section className='px-6 pb-16 md:pb-24 max-w-5xl mx-auto'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6'>
          {ORIGINALS_LIST.map((original) => (
            <Link
              key={original.slug}
              href={`/originals/${original.slug}`}
              className='group flex flex-col bg-white/10 backdrop-blur-md border border-white/15 hover:border-stride-yellow-accent/50 rounded-xl px-6 py-7 min-h-11 transition-colors duration-200'
            >
              <h2 className='text-2xl md:text-3xl font-bold font-libre text-copy-white mb-2 leading-snug group-hover:text-stride-yellow-accent transition-colors duration-150'>
                {original.title}
              </h2>
              <p className='text-stride-yellow-accent font-medium mb-4'>{original.tagline}</p>
              <p className='text-copy-white/60 leading-relaxed line-clamp-4 mb-6'>
                {original.description}
              </p>

              <div className='mt-auto flex flex-wrap gap-x-6 gap-y-2'>
                {original.highlights.map(({ label, value }) => (
                  <div key={label}>
                    <p className='text-lg font-bold font-libre text-copy-white'>{value}</p>
                    <p className='text-copy-white/40 text-xs font-mono uppercase tracking-wide'>
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <span className='mt-6 inline-flex items-center gap-2 text-sm font-medium text-copy-white/50 group-hover:text-stride-yellow-accent transition-colors duration-150'>
                Read more
                <ArrowRight className='size-4' aria-hidden='true' />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
