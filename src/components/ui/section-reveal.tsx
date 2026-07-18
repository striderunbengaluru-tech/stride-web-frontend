'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type SectionRevealProps = {
  children: ReactNode
  className?: string
  delay?: number
}

type Phase = 'visible' | 'hidden' | 'revealed'

// Scroll-reveal via IntersectionObserver + a CSS transition, with a
// content-first contract: the server HTML renders everything VISIBLE, so the
// page is fully readable before (or without) JavaScript. After hydration,
// only elements still below the fold are hidden and animated in on scroll —
// hiding below-fold content is invisible to the viewer, so there's no flash.
// (The previous version SSR'd opacity:0 and pages appeared blank until
// hydration finished.)
export function SectionReveal({ children, className, delay = 0 }: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('visible')

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // No IO support, or reduced motion requested → stay visible, no animation
    if (typeof IntersectionObserver === 'undefined'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    // Already on screen (or above it) at hydration time → leave it visible;
    // animating content the visitor is reading would be a regression.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight - 80) return

    setPhase('hidden')
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPhase('revealed')
          observer.disconnect()
        }
      },
      // Reveal starts once the element is 80px inside the viewport
      { rootMargin: '-80px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const hidden = phase === 'hidden'
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? 'translateY(28px)' : 'translateY(0)',
        // No transition in the initial visible state — content must not fade
        // on first paint
        transition: phase === 'visible'
          ? undefined
          : `opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}
