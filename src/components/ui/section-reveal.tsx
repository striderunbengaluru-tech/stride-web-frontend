'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type SectionRevealProps = {
  children: ReactNode
  className?: string
  delay?: number
}

type Phase = 'visible' | 'hidden' | 'revealed'

// Past this much time since navigation start, assume the visitor is already
// reading the painted HTML and never hide anything.
const LATE_HYDRATION_MS = 800

// PREFER `<Reveal>` (src/components/ui/reveal.tsx) FOR NEW CODE — it is a
// server component whose reveal is pure CSS, so it ships no JavaScript and
// cannot be delayed by hydration.
//
// This JS variant is retained only for the markdown renderer, where reveals are
// generated from user content and the ancestor chain can't be statically
// checked for the `overflow-hidden` constraint that a CSS view() timeline has.
//
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

    // Hydration arrived late (slow mobile CPU / connection) → the server HTML
    // has been painted and readable for a while, and the visitor may already be
    // scrolling through it. Hiding it now is the "sections are empty when I
    // scroll" bug: the fade-back-in then queues behind the very long task that
    // delayed us. Past this point, skip the animation entirely.
    if (performance.now() > LATE_HYDRATION_MS) return

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
      // Reveal BEFORE the element scrolls into view — the bottom margin extends
      // the root downward so the fade begins ~40% of a screen early and has
      // finished by the time the section is actually on screen. The old
      // `-80px` fired only after the element was already 80px inside the
      // viewport, leaving a visible blank band that "loaded in" as you scrolled.
      { rootMargin: '0px 0px 40% 0px' }
    )
    observer.observe(el)

    // Safety net: never leave a section stuck invisible if the observer somehow
    // doesn't fire (e.g. it renders inside a scroll container it can't observe).
    const fallback = setTimeout(() => setPhase(p => (p === 'hidden' ? 'revealed' : p)), 1200)
    return () => {
      observer.disconnect()
      clearTimeout(fallback)
    }
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
