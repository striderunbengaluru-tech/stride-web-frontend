'use client'

import { useSyncExternalStore } from 'react'
import { ArrowUp } from 'lucide-react'

const SHOW_AFTER_PX = 600

function subscribe(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => window.removeEventListener('scroll', onChange)
}

// Floating scroll-to-top button. Appears once the reader is deep into the
// page so the header actions (e.g. the "All Events" back link on an event
// page) stay one tap away.
export function BackToTop() {
  const visible = useSyncExternalStore(
    subscribe,
    () => window.scrollY > SHOW_AFTER_PX,
    () => false,
  )

  function scrollToTop() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <button
      type='button'
      onClick={scrollToTop}
      aria-label='Back to top'
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-24 md:bottom-6 right-4 sm:right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full bg-stride-purple-primary/80 backdrop-blur-xl border border-white/15 text-white/70 shadow-lg hover:text-white hover:border-stride-yellow-accent/50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <ArrowUp size={18} />
    </button>
  )
}
