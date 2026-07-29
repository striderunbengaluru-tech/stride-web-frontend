import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MilestoneJourney, MilestoneJourneySkeleton } from '@/components/milestones/milestone-journey'

export const metadata: Metadata = {
  title: 'Milestones — Stride Run Club',
  description: 'Earn badges and rewards as you run with Stride. Progress from Duckling to Stride Legend.',
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
