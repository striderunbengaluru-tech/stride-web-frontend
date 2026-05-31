'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Refresh the current Server Component tree whenever the page is restored from
// the browser's back/forward cache. Without this, navigating back to an event
// page (e.g. from the confirmation page) can show the cached pre-registration
// state with an active Register CTA — even though the server already knows the
// user is registered.
export function BfcacheRefresh() {
  const router = useRouter()
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) router.refresh()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [router])
  return null
}
