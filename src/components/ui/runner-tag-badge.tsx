import { Tag } from 'lucide-react'

type Size = 'xs' | 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<Size, { pill: string; icon: number }> = {
  xs: { pill: 'px-1.5 py-0.5 gap-1 text-[10px]', icon: 9 },
  sm: { pill: 'px-2 py-0.5 gap-1 text-xs', icon: 11 },
  md: { pill: 'px-2.5 py-1 gap-1.5 text-sm', icon: 13 },
  lg: { pill: 'px-3 py-1.5 gap-2 text-base', icon: 15 },
}

type Props = {
  tag: string
  size?: Size
  className?: string
}

export function RunnerTagBadge({ tag, size = 'sm', className = '' }: Props) {
  const { pill, icon } = SIZE_MAP[size]
  return (
    <span
      className={`inline-flex items-center font-mono font-bold text-stride-yellow-accent bg-stride-yellow-accent/10 border border-stride-yellow-accent/20 rounded-md tracking-widest ${pill} ${className}`}
    >
      <Tag size={icon} className='shrink-0' strokeWidth={2.5} />
      {tag}
    </span>
  )
}
