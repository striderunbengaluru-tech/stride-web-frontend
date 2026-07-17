'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type SectionRevealProps = {
  children: ReactNode
  className?: string
  delay?: number
}

// Scroll-reveal via IntersectionObserver + a CSS transition. Same API and
// motion (fade + 28px rise, 0.6s, same cubic-bezier) as the old
// framer-motion version, but with zero library weight — this component is
// used on nearly every page, and the rewrite keeps framer-motion out of the
// global client bundle. Respects prefers-reduced-motion via the transition
// being a no-op when the browser disables it.
export function SectionReveal({ children, className, delay = 0 }: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // No IO support, or reduced motion requested → show immediately
    if (typeof IntersectionObserver === 'undefined'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      // Matches the old framer `margin: '-80px'` — reveal starts once the
      // element is 80px inside the viewport
      { rootMargin: '-80px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}
