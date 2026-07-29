import type { CSSProperties } from 'react'

// Single source of truth for Stride's milestone tiers. Used by the profile page
// (badge + avatar frame colour + progress chips) and the public /milestones page.
// Tiers are driven by `runs_completed`, which increments on a successful event
// check-in. Labels, colours, run bands and perks are all confirmed copy.

const BADGE_BASE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets'

export type MilestoneTier = {
  key: string
  label: string
  /** Tier artwork. Always render through `TierBadge` so it gets resized. */
  badge: string
  threshold: number          // runs at which this tier begins (inclusive)
  nextAt: number | null      // runs needed to reach the next tier; null for the top tier
  frame: string              // hex colour for the avatar frame border
  /**
   * Optional hairline drawn just outside the avatar frame. Only set for tiers
   * whose `frame` is too dark to separate from the page on its own — without it
   * a black frame reads as a missing frame rather than a deliberate one.
   */
  frameRing?: string
  chip: string               // tailwind text/border/bg classes for the public badge pill
  dot: string                // tailwind bg-* for the small tier dot
  perks: string[]            // shown on the /milestones page
}

export const MILESTONE_TIERS: MilestoneTier[] = [
  {
    key: 'duckling',
    label: 'Duckling',
    badge: `${BADGE_BASE}/tier-1-duckling-badge.webp`,
    threshold: 0,
    nextAt: 6,
    frame: '#34d399',
    chip: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10',
    dot: 'bg-emerald-400',
    perks: [
      'Digital loyalty badge',
      'Official Stride Run Club membership',
      'Official Stride member tag',
      'Access to the Stride WhatsApp Community after your first run',
    ],
  },
  {
    key: 'strider',
    label: 'Strider',
    badge: `${BADGE_BASE}/tier-2-strider-badge.webp`,
    threshold: 6,
    nextAt: 25,
    frame: '#60a5fa',
    chip: 'text-blue-400 border-blue-400/40 bg-blue-400/10',
    dot: 'bg-blue-400',
    perks: [
      'Everything in Duckling',
      'Strider digital certificate',
      'Access to Strider-only giveaways',
      'Discounts from Stride partner brands',
      'Exclusive Strider badge',
    ],
  },
  {
    key: 'stride-athlete',
    label: 'Stride Athlete',
    badge: `${BADGE_BASE}/tier-3-stride-athlete-badge.webp`,
    threshold: 25,
    nextAt: 73,
    frame: '#c084fc',
    chip: 'text-purple-400 border-purple-400/40 bg-purple-400/10',
    dot: 'bg-purple-400',
    perks: [
      'Everything in Strider',
      'Official Stride socks',
      'Exclusive Stride Athlete badge',
      '10% discount on Stride merchandise',
      '10% discount on all paid Stride experiences',
      'Priority access to flagship events',
      'Invitations to exclusive training sessions',
      'Eligible to volunteer at Stride events',
      'Invitations to select invite-only experiences',
      'Eligible for brand collaborations, if you actively create content',
    ],
  },
  {
    key: 'stride-pro-athlete',
    label: 'Stride Pro Athlete',
    badge: `${BADGE_BASE}/tier-4-stride-pro-athlete-badge.webp`,
    threshold: 73,
    nextAt: 109,
    frame: '#fb923c',
    chip: 'text-orange-400 border-orange-400/40 bg-orange-400/10',
    dot: 'bg-orange-400',
    perks: [
      'Everything in Stride Athlete',
      'Exclusive Stride Pro Athlete badge',
      'Stride Pro Kit (T-shirt, socks, and exclusive gear)',
      '15% discount on all paid Stride experiences',
      '15% discount on Stride merchandise',
      'Opportunity to apply as an organizing team member',
      'Chance to win entries to national and international races (HYROX, marathons, Ironman, etc.)',
      'Chance to bag nutritional and recovery support',
    ],
  },
  {
    key: 'stride-legend',
    label: 'Stride Legend',
    badge: `${BADGE_BASE}/tier-5-stride-legend-badge.webp`,
    threshold: 109,
    nextAt: null,
    // Black is the tier's identity colour. On the dark purple site background a
    // black fill has almost no contrast on its own, so the chip pairs it with
    // white text and a light border, and the avatar frame gets a light hairline.
    frame: '#0a0a0a',
    frameRing: 'rgba(255,255,255,0.45)',
    chip: 'text-white border-white/45 bg-neutral-950',
    dot: 'bg-neutral-950',
    perks: [
      'Everything in Stride Pro Athlete',
      'Exclusive Stride Legend badge',
      '20% discount on all paid Stride experiences',
      '20% discount on Stride merchandise',
      'Priority access to all flagship and limited-capacity events',
      'First preference for creator collaborations and brand partnerships',
      'Opportunity to become a Format Director',
      'Opportunity to mentor volunteers',
      'Recognition in the Stride Hall of Legends on the website',
      'Exclusive Legend-only experiences',
    ],
  },
]

/**
 * Inline style for a tier-coloured avatar frame. Kept here, next to the colours
 * it interprets, so the three places that render a frame can't drift apart. The
 * hairline is a `box-shadow` spread rather than a wider border so it costs no
 * layout space and never changes the avatar's size.
 */
export function avatarFrameStyle(
  frame?: string,
  frameRing?: string
): CSSProperties | undefined {
  if (!frame) return undefined
  return frameRing
    ? { borderColor: frame, boxShadow: `0 0 0 1px ${frameRing}` }
    : { borderColor: frame }
}

export function getMilestone(runs: number): MilestoneTier {
  // Walk down from the highest tier so the first match wins.
  for (let i = MILESTONE_TIERS.length - 1; i >= 0; i--) {
    if (runs >= MILESTONE_TIERS[i]!.threshold) return MILESTONE_TIERS[i]!
  }
  return MILESTONE_TIERS[0]!
}
