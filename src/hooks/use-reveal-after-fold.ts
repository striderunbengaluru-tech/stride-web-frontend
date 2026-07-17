'use client'

import { useEffect, useState } from 'react'

// Mobile staging for overlay chrome (cookie notice, bottom-docked nav): keep it
// hidden until the visitor scrolls into the second fold so the first screen
// isn't crowded with competing elements. Desktop (md+) reveals immediately, as
// does any page too short to ever reach the scroll threshold. Once revealed it
// stays revealed for the rest of the page view.
const MD_BREAKPOINT_PX = 768
const REVEAL_SCROLL_RATIO = 0.75

export function useRevealAfterFold(): boolean {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (window.innerWidth >= MD_BREAKPOINT_PX) {
      setRevealed(true)
      return
    }

    const pageTooShortToScroll =
      document.documentElement.scrollHeight <=
      window.innerHeight * (1 + REVEAL_SCROLL_RATIO)
    if (pageTooShortToScroll) {
      setRevealed(true)
      return
    }

    function onScroll() {
      if (window.scrollY >= window.innerHeight * REVEAL_SCROLL_RATIO) {
        setRevealed(true)
        window.removeEventListener('scroll', onScroll)
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return revealed
}
