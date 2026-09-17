'use client'

import { useRef, useState, type RefObject } from 'react'

const DEFAULT_FORM_PCT = 52
const MIN_FORM_PCT = 30
const MAX_FORM_PCT = 70

/**
 * The draggable form | preview split used by the admin forms. Returns the
 * container ref the percentage is measured against, the current left-pane
 * width, and the mousedown handler for the divider.
 */
export function useSplitPane(
  initialPct = DEFAULT_FORM_PCT,
  min = MIN_FORM_PCT,
  max = MAX_FORM_PCT,
): {
  containerRef: RefObject<HTMLDivElement | null>
  formWidthPct: number
  onDragStart: (e: React.MouseEvent) => void
} {
  const containerRef = useRef<HTMLDivElement>(null)
  const [formWidthPct, setFormWidthPct] = useState(initialPct)

  function onDragStart(e: React.MouseEvent) {
    e.preventDefault()
    function onMouseMove(ev: MouseEvent) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setFormWidthPct(Math.min(Math.max(pct, min), max))
    }
    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return { containerRef, formWidthPct, onDragStart }
}
