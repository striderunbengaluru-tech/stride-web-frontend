import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { MILESTONE_TIERS, getMilestone, type MilestoneTier } from '@/lib/milestones'
import { Timeline, type TimelineEntry } from '@/components/ui/timeline'
import { TierBadge } from '@/components/ui/tier-badge'
import { cn } from '@/lib/utils'

// Viewer-dependent island, streamed in via <Suspense> so the page's heading and
// back link render immediately. Signed-out visitors simply get the ladder with
// no "You are here" marker — there's nothing to place them against.
async function getViewerRuns(): Promise<number | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await adminClient
    .from('users')
    .select('runs_completed')
    .eq('id', user.id)
    .maybeSingle()

  return data?.runs_completed ?? 0
}

function thresholdLabel(tier: MilestoneTier) {
  return tier.nextAt ? `${tier.threshold}–${tier.nextAt - 1} runs` : `${tier.threshold}+ runs`
}

type CardProps = {
  tier: MilestoneTier
  runs: number | null
  isCurrent: boolean
  isUnlocked: boolean
  nextLabel: string | null
}

function TierCard({ tier, runs, isCurrent, isUnlocked, nextLabel }: CardProps) {
  // Progress through the *current* tier: 0% on the run that unlocked it, 100%
  // on the run that promotes you. The top tier has nowhere further to go.
  const progressPct =
    isCurrent && runs !== null && tier.nextAt
      ? Math.min(100, Math.max(0, ((runs - tier.threshold) / (tier.nextAt - tier.threshold)) * 100))
      : 100

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 backdrop-blur-md transition-colors',
        isCurrent
          ? 'border-stride-yellow-accent/40 bg-stride-yellow-accent/8'
          : 'border-white/10 bg-white/8 hover:border-white/20'
      )}
    >
      {/* Header — emoji tile, tier name, run range */}
      <div className='flex items-center gap-3 flex-wrap mb-4'>
        {/* The badge lives beside the tier name in the timeline column, not here */}
        {/* No tier name here — the timeline already labels the row, inline on
            mobile and as the sticky heading on desktop. */}
        <p className='min-w-0 text-white/50 text-xs font-mono'>{thresholdLabel(tier)}</p>
        {isCurrent && (
          <span className='ml-auto inline-flex items-center rounded-full bg-stride-yellow-accent px-2.5 py-1 text-[10px] font-bold font-mono uppercase tracking-widest text-copy-black'>
            You are here
          </span>
        )}
      </div>

      {/* Progress toward the next tier — only on the viewer's own tier */}
      {isCurrent && runs !== null && (
        <div className='mb-4'>
          <div className='flex items-center justify-between gap-2 mb-1.5 text-[10px] font-mono tabular-nums text-white/45'>
            <span>{runs} {runs === 1 ? 'run' : 'runs'} completed</span>
            <span className='text-right'>
              {tier.nextAt && nextLabel
                ? `${tier.nextAt - runs} more to ${nextLabel}`
                : 'Top tier reached'}
            </span>
          </div>
          <div
            className='h-1.5 w-full overflow-hidden rounded-full bg-white/10'
            role='progressbar'
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress through ${tier.label}`}
          >
            <div
              className='h-full rounded-full bg-stride-yellow-accent transition-all duration-700'
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Perks */}
      <ul className='space-y-1.5'>
        {tier.perks.map((perk) => (
          <li key={perk} className='flex items-start gap-2 text-white/70 text-sm'>
            <Check
              size={13}
              aria-hidden='true'
              className={cn(
                'mt-0.5 shrink-0',
                isUnlocked ? 'text-stride-yellow-accent' : 'text-white/25'
              )}
            />
            {perk}
          </li>
        ))}
      </ul>
    </div>
  )
}

export async function MilestoneJourney() {
  const runs = await getViewerRuns()
  const currentKey = runs !== null ? getMilestone(runs).key : null

  const entries: TimelineEntry[] = MILESTONE_TIERS.map((tier, i) => ({
    title: tier.label,
    isCurrent: tier.key === currentKey,
    media: (
      <TierBadge
        tier={tier}
        size='2xl'
        locked={runs !== null && runs < tier.threshold}
      />
    ),
    content: (
      <TierCard
        tier={tier}
        runs={runs}
        isCurrent={tier.key === currentKey}
        isUnlocked={runs !== null && runs >= tier.threshold}
        nextLabel={MILESTONE_TIERS[i + 1]?.label ?? null}
      />
    ),
  }))

  return <Timeline data={entries} label='Stride milestone tiers' />
}

// Same rail + card geometry as the resolved state, so the stream-in doesn't shift.
export function MilestoneJourneySkeleton() {
  return (
    <div className='relative' aria-hidden='true'>
      <div className='absolute left-5 top-0 bottom-0 w-px bg-white/10' />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className='flex justify-start pt-8 first:pt-2 md:pt-16 md:first:pt-4 md:gap-10'>
          <div className='relative flex items-center self-start max-w-40 md:max-w-xs lg:max-w-sm md:w-full'>
            <span className='absolute left-0 h-10 w-10 rounded-full border border-white/15 bg-white/10' />
            <span className='hidden md:block md:pl-20 h-8 w-40 rounded-md bg-white/10 animate-pulse' />
          </div>
          <div className='w-full min-w-0 pl-14 md:pl-4'>
            <div className='h-44 rounded-2xl border border-white/10 bg-white/5 animate-pulse' />
          </div>
        </div>
      ))}
    </div>
  )
}
