import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { MilestoneTier } from '@/lib/milestones'

// The source artwork is ~0.8–1.7 MB per tier while it renders between 16px and
// 40px, so everything goes through next/image, which serves a resized AVIF/WebP
// variant of a few KB (cached per next.config's 31-day minimumCacheTTL). Never
// render `tier.badge` directly.
//
// Deliberately no `sizes`: these are fixed-size images, and passing `sizes`
// makes Next emit the whole responsive ladder up to 3840w. Width alone gets a
// tight 1x/2x srcset instead.

const SIZES = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 56,
  '2xl': 112,
} as const

type Props = {
  tier: Pick<MilestoneTier, 'badge' | 'label'>
  size?: keyof typeof SIZES
  /** Dims the badge for tiers the member hasn't reached yet. */
  locked?: boolean
  /**
   * Set when the tier name is already rendered next to the badge — the image
   * then carries no alt text so screen readers don't announce it twice.
   */
  decorative?: boolean
  className?: string
}

export function TierBadge({ tier, size = 'md', locked = false, decorative = true, className }: Props) {
  const px = SIZES[size]

  return (
    <Image
      src={tier.badge}
      alt={decorative ? '' : `${tier.label} badge`}
      aria-hidden={decorative || undefined}
      width={px}
      height={px}
      className={cn(
        'shrink-0 object-contain',
        locked && 'opacity-40 grayscale',
        className
      )}
    />
  )
}
