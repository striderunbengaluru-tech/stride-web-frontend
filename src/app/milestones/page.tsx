import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Milestones — Stride Run Club',
  description: 'Earn badges and rewards as you run with Stride. Progress from Stride Newbie to OG Member.',
}

const MILESTONES = [
  {
    level: 'Stride Newbie',
    threshold: '0–5 runs',
    emoji: '🏃',
    badgeClasses: 'text-green-400 border-green-400/40 bg-green-400/10',
    barClasses: 'bg-green-400',
    perks: [
      'Exclusive Stride Newbie badge on your public profile',
      'Access to the Stride members-only WhatsApp group',
      'Early access to event announcements before public release',
      'Priority support from the Stride team',
    ],
  },
  {
    level: 'Stride Regular',
    threshold: '6–15 runs',
    emoji: '⚡',
    badgeClasses: 'text-blue-400 border-blue-400/40 bg-blue-400/10',
    barClasses: 'bg-blue-400',
    perks: [
      'Stride Regular badge + all Newbie perks',
      'Priority registration slot in high-demand events',
      '10% discount on official Stride merchandise',
      'Featured shoutout on the Stride Instagram page',
      'Invite to exclusive Stride training sessions',
    ],
  },
  {
    level: 'Stride OG Member',
    threshold: '16+ runs',
    emoji: '🏆',
    badgeClasses: 'text-stride-yellow-accent border-stride-yellow-accent/40 bg-stride-yellow-accent/10',
    barClasses: 'bg-stride-yellow-accent',
    perks: [
      'Stride OG badge + all previous perks',
      'Free registration for one annual Stride event',
      'Exclusive OG edition Stride jersey',
      'Lifetime Stride community recognition',
      'Name on the Stride OG Member wall of fame',
    ],
  },
]

export default function MilestonesPage() {
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
          <p className='text-stride-yellow-accent text-xs font-semibold uppercase tracking-widest mb-2'>Community Rewards</p>
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
                    <div className={`h-1 rounded-full ${m.barClasses}`} style={{ width: `${(idx + 1) / 3 * 100}%` }} />
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
