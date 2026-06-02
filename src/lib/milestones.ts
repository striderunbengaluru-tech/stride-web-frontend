// Single source of truth for Stride's milestone tiers. Used by the profile page
// (badge + avatar frame colour + progress chips) and the public /milestones page.
// Tiers are driven by `runs_completed`. Placeholder copy — tune thresholds/perks later.

export type MilestoneTier = {
  key: string
  label: string
  emoji: string
  threshold: number          // runs at which this tier begins (inclusive)
  nextAt: number | null      // runs needed to reach the next tier; null for the top tier
  frame: string              // hex colour for the avatar frame border
  chip: string               // tailwind text/border/bg classes for the public badge pill
  dot: string                // tailwind bg-* for the small tier dot
  perks: string[]            // shown on the /milestones page
}

export const MILESTONE_TIERS: MilestoneTier[] = [
  {
    key: 'rookie',
    label: 'Rookie',
    emoji: '🌱',
    threshold: 0,
    nextAt: 5,
    frame: '#34d399',
    chip: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10',
    dot: 'bg-emerald-400',
    perks: [
      'Rookie badge on your public profile',
      'Access to the Stride members-only WhatsApp group',
      'Early access to event announcements',
    ],
  },
  {
    key: 'strider',
    label: 'Strider',
    emoji: '🏃',
    threshold: 5,
    nextAt: 15,
    frame: '#38bdf8',
    chip: 'text-sky-400 border-sky-400/40 bg-sky-400/10',
    dot: 'bg-sky-400',
    perks: [
      'Strider badge + all Rookie perks',
      'Priority registration in high-demand events',
      '10% off official Stride merch',
    ],
  },
  {
    key: 'pacer',
    label: 'Pacer',
    emoji: '🔥',
    threshold: 15,
    nextAt: 30,
    frame: '#fb923c',
    chip: 'text-orange-400 border-orange-400/40 bg-orange-400/10',
    dot: 'bg-orange-400',
    perks: [
      'Pacer badge + all previous perks',
      'Featured shoutout on the Stride Instagram',
      'Invite to exclusive training sessions',
    ],
  },
  {
    key: 'elite',
    label: 'Elite',
    emoji: '🏅',
    threshold: 30,
    nextAt: 50,
    frame: '#a78bfa',
    chip: 'text-violet-400 border-violet-400/40 bg-violet-400/10',
    dot: 'bg-violet-400',
    perks: [
      'Elite badge + all previous perks',
      'Free registration for one annual Stride event',
      'Exclusive Elite edition Stride jersey',
    ],
  },
  {
    key: 'legend',
    label: 'Legend',
    emoji: '👑',
    threshold: 50,
    nextAt: null,
    frame: '#E1D03F',
    chip: 'text-stride-yellow-accent border-stride-yellow-accent/40 bg-stride-yellow-accent/10',
    dot: 'bg-stride-yellow-accent',
    perks: [
      'Legend badge + all previous perks',
      'Lifetime Stride community recognition',
      'Name on the Stride Legends wall of fame',
    ],
  },
]

export function getMilestone(runs: number): MilestoneTier {
  // Walk down from the highest tier so the first match wins.
  for (let i = MILESTONE_TIERS.length - 1; i >= 0; i--) {
    if (runs >= MILESTONE_TIERS[i]!.threshold) return MILESTONE_TIERS[i]!
  }
  return MILESTONE_TIERS[0]!
}
