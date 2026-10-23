'use client'

import { useEffect, type RefObject } from 'react'

/** Calls `onDismiss` on a mousedown outside `ref` or an Escape keypress. */
export function useDismiss(ref: RefObject<HTMLElement | null>, onDismiss: () => void) {
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss()
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('mousedown', onOutsideClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onOutsideClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [ref, onDismiss])
}
