import clsx from 'clsx'
import type { ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  className?: string
}

// Scroll-reveal wrapper. Deliberately a SERVER component — the whole animation
// lives in the `.reveal` CSS class (see globals.css), so this ships zero client
// JavaScript and the reveal cannot be delayed by hydration.
//
// Two caller responsibilities:
//   1. Avoid `overflow-hidden` on an ancestor. It becomes a scroll container,
//      view() resolves against it, and the timeline goes dead — the reveal then
//      silently does nothing (content stays visible, so nothing breaks, but the
//      animation is lost). `overflow-clip` / `overflow-x-clip` clip the same way
//      and keep the animation working.
//   2. When several <Reveal>s are siblings that enter the viewport together
//      (e.g. a 3-up grid), add `reveal-stagger` to their shared parent so they
//      cascade instead of firing as one block.
// Both are documented in globals.css alongside the CSS, with the measurements.
export function Reveal({ children, className }: RevealProps) {
  return <div className={clsx('reveal', className)}>{children}</div>
}
