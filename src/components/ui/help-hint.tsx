'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { HelpCircle } from 'lucide-react'

type Props = {
  text: string
}

// `useLayoutEffect` runs only client-side. On SSR we silently fall back to
// `useEffect` to avoid the "useLayoutEffect does nothing on the server" warning.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Small "?" icon with tooltip. Hover on desktop, tap on mobile.
// Viewport-aware: shifts horizontally so the popover never bleeds off-screen.
export function HelpHint({ text }: Props) {
  const [open, setOpen] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [offsetX, setOffsetX] = useState(0)
  const rootRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLSpanElement>(null)

  const visible = open || hovering

  // Close on outside click / tap
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  // Viewport-aware horizontal shift — runs every time the tooltip becomes
  // visible. Measures the tooltip rect and nudges it left/right so it stays
  // at least 8px from each edge. Also re-runs on window resize while visible.
  useIsoLayoutEffect(() => {
    if (!visible) return
    function measure() {
      const tip = tipRef.current
      if (!tip) return
      // Reset offset so the next measurement is from the natural position
      tip.style.transform = ''
      const rect = tip.getBoundingClientRect()
      const margin = 8
      let delta = 0
      if (rect.left < margin) delta = margin - rect.left
      else if (rect.right > window.innerWidth - margin) delta = (window.innerWidth - margin) - rect.right
      setOffsetX(delta)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [visible])

  return (
    <span
      ref={rootRef}
      className='relative inline-flex'
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type='button'
        onClick={() => setOpen(o => !o)}
        aria-label='Help'
        className='text-white/30 hover:text-stride-yellow-accent transition-colors flex items-center justify-center'
      >
        <HelpCircle size={13} />
      </button>
      <span
        ref={tipRef}
        role='tooltip'
        style={{ transform: `translateX(${offsetX}px)`, maxWidth: 'min(15rem, calc(100vw - 16px))' }}
        className={`absolute right-0 top-full mt-1.5 z-30 w-max rounded-lg bg-stride-purple-primary border border-white/15 px-3 py-2 text-[11px] leading-snug text-white/85 shadow-xl pointer-events-none transition-opacity duration-150 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {text}
      </span>
    </span>
  )
}
