import { Star } from 'lucide-react'

/**
 * The INVITE ONLY marker.
 *
 * Invite-only events stay fully listed — the badge is the whole point of that
 * decision, so it has to read as scarcity from across a card grid rather than
 * as a neutral status chip. Hence the glow and the shimmer sweep.
 *
 * Both live in globals.css: `.glow-yellow` (shared with the nav indicator) and
 * `.invite-shimmer`, which carries its own `prefers-reduced-motion` kill
 * switch. The pill is `relative overflow-hidden` so the sheen clips to it.
 */

type Size = 'sm' | 'md'

const SIZE_MAP: Record<Size, { pill: string; icon: number }> = {
  sm: { pill: 'px-2 py-0.5 gap-1 text-[10px] tracking-[0.14em]', icon: 10 },
  md: { pill: 'px-3 py-1 gap-1.5 text-xs tracking-[0.18em]', icon: 12 },
}

type Props = {
  size?: Size
  className?: string
}

export function InviteOnlyBadge({ size = 'sm', className = '' }: Props) {
  const { pill, icon } = SIZE_MAP[size]

  return (
    <span
      className={`relative overflow-hidden invite-shimmer glow-yellow inline-flex items-center font-mono font-bold uppercase text-stride-yellow-accent bg-stride-yellow-accent/15 border border-stride-yellow-accent/50 rounded-md whitespace-nowrap ${pill} ${className}`}
    >
      <Star size={icon} className='shrink-0 fill-stride-yellow-accent' strokeWidth={2.5} aria-hidden='true' />
      Invite only
    </span>
  )
}
