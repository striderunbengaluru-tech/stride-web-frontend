import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DEFAULT_OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from '@/lib/seo'
import { ArrowLeft } from 'lucide-react'
import { MilestoneJourney, MilestoneJourneySkeleton } from '@/components/milestones/milestone-journey'

// Title carries no brand suffix — the root layout's template appends
// " | Stride Run Club". openGraph/twitter are declared in full because a child
// that omits them inherits the layout's objects wholesale, which had every
// shared link to this page previewing as the homepage.
export const metadata: Metadata = {
  title: 'Milestones & Member Rewards',
  description:
    'Show up, climb the tiers. Check in at Stride runs to progress from Duckling to Stride Legend and unlock rewards for the club’s most committed members.',
  keywords: ['Stride Run Club milestones', 'running rewards Bengaluru', 'run club membership tiers', 'running badges', 'Stride Legend'],
  alternates: { canonical: '/milestones' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Stride Run Club',
    url: '/milestones',
    title: 'Milestones & Member Rewards — Stride Run Club',
    description:
      'Five tiers, from Duckling to Stride Legend. You don’t have to be the fastest runner to earn recognition — just keep showing up.',
    images: [{ url: DEFAULT_OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: 'Stride Run Club — milestones and member rewards' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Milestones & Member Rewards — Stride Run Club',
    description: 'Five tiers, from Duckling to Stride Legend. Just keep showing up.',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function MilestonesPage() {
  return (
    <main className='min-h-screen bg-stride-purple-primary pt-28 pb-24 px-4'>
      <div className='max-w-4xl mx-auto'>

        <Link
          href='/'
          className='inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mb-8'
        >
          <ArrowLeft size={15} aria-hidden='true' />
          Back
        </Link>

        <div className='mb-6 md:mb-10'>
          <p className='text-stride-yellow-accent text-xs font-semibold font-mono uppercase tracking-widest mb-2'>
            Community Rewards
          </p>
          <h1 className='font-libre text-3xl md:text-5xl font-bold text-white mb-3 leading-tight'>
            Stride Milestones
          </h1>
          <p className='text-white/50 text-sm md:text-base leading-relaxed max-w-md'>
            Run with us. Earn your badge. Unlock real rewards for showing up.
          </p>
        </div>

        {/* Viewer-dependent — streamed so the heading paints immediately */}
        <Suspense fallback={<MilestoneJourneySkeleton />}>
          <MilestoneJourney />
        </Suspense>

        <p className='mt-12 text-center text-white/25 text-xs'>
          Run count is updated automatically when you have successfully checked-in to your events.
        </p>
      </div>
    </main>
  )
}
