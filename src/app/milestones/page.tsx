import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { guardPreviewFeature } from '@/lib/feature-flags'
import { MILESTONE_TIERS } from '@/lib/milestones'

export const metadata: Metadata = {
  title: 'Milestones — Stride Run Club',
  description: 'Earn badges and rewards as you run with Stride. Progress from Rookie to Legend.',
}

const MILESTONES = MILESTONE_TIERS.map(tier => ({
  level: tier.label,
  threshold: tier.nextAt ? `${tier.threshold}–${tier.nextAt - 1} runs` : `${tier.threshold}+ runs`,
  emoji: tier.emoji,
  badgeClasses: tier.chip,
  barClasses: tier.dot,
  perks: tier.perks,
}))

export default function MilestonesPage() {
  guardPreviewFeature()

  return (
    <main className='min-h-screen bg-stride-purple-primary pt-28 pb-16 px-4'>
      <div className='max-w-2xl mx-auto'>

        <Link
          href='/'
          className='inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mb-8'
        >
          <ArrowLeft size={15} />
          Back
        </Link>

        <div className='mb-10 text-center'>
          <p className='text-stride-yellow-accent text-xs font-semibold font-mono uppercase tracking-widest mb-2'>Community Rewards</p>
          <h1 className='text-3xl font-bold text-white mb-3'>Stride Milestones</h1>
          <p className='text-white/50 text-sm leading-relaxed max-w-sm mx-auto'>
            Run with us. Earn your badge. Unlock real rewards for showing up.
          </p>
        </div>

        <div className='space-y-5'>
          {MILESTONES.map((m, idx) => (
            <div
              key={m.level}
              className='bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors'
            >
              <div className='flex items-start gap-4'>
                {/* Icon */}
                <div className={`text-2xl w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${m.badgeClasses}`}>
                  {m.emoji}
                </div>

                <div className='flex-1 min-w-0'>
                  {/* Title + badge */}
                  <div className='flex flex-wrap items-center gap-2 mb-3'>
                    <h2 className='text-white font-bold text-lg'>{m.level}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${m.badgeClasses}`}>
                      {m.threshold}
                    </span>
                    {/* Step number */}
                    <span className='ml-auto text-white/20 text-xs font-mono'>
                      0{idx + 1}
                    </span>
                  </div>

                  {/* Mini progress indicator */}
                  <div className='w-full bg-white/10 rounded-full h-1 mb-4'>
                    <div className={`h-1 rounded-full ${m.barClasses}`} style={{ width: `${(idx + 1) / MILESTONES.length * 100}%` }} />
                  </div>

                  {/* Perks */}
                  <ul className='space-y-1.5'>
                    {m.perks.map((perk, i) => (
                      <li key={i} className='flex items-start gap-2 text-white/70 text-sm'>
                        <Check size={13} className='text-stride-yellow-accent mt-0.5 shrink-0' aria-hidden='true' />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className='mt-8 text-center text-white/25 text-xs'>
          Run count is updated automatically when your Stride event registration is confirmed.
        </p>
      </div>
    </main>
  )
}
