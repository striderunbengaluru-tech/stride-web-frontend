'use client'

import { useEffect } from 'react'

/**
 * Freezes the page behind a modal while `active`, so only the modal scrolls.
 *
 * `overflow: hidden` on <body> alone is ignored by iOS Safari, where a touch
 * drag still scrolls the page underneath. Pinning the body with
 * `position: fixed` at the current offset works everywhere; the offset is
 * restored on release so the visitor lands back where they were.
 *
 * Only on the same page, though. A modal that navigates away (the register
 * modal pushing to the confirmation page) unmounts AFTER the new route has
 * rendered, and restoring the old page's offset there dropped the runner at
 * the footer of the confirmation page.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const { body } = document
    const scrollY = window.scrollY
    const lockedPath = window.location.pathname
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'

    return () => {
      Object.assign(body.style, previous)
      window.scrollTo(0, window.location.pathname === lockedPath ? scrollY : 0)
    }
  }, [active])
}
