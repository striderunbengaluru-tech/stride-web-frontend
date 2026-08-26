'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'
import { useRevealAfterFold } from '@/hooks/use-reveal-after-fold'

// DPDP transparency notice. This banner INFORMS — it has no accept/reject, so it
// is not a consent gate.
//
// That was accurate while every cookie was strictly necessary. It no longer is:
// Google Analytics (src/components/analytics/google-analytics.tsx) sets `_ga`
// cookies on production, which are analytics, not essential. The copy below and
// Section 5 of the privacy policy were updated to say so.
//
// So if a consent gate is ever built, this is the component to build it in, and
// GoogleAnalytics is what it has to gate — do not add another cookie-setting
// third party on the assumption that this banner covers it.
//
// Pressing OK stores the acknowledgement in a 1-year cookie (strictly necessary
// category), so the banner shows only once per browser. Legacy localStorage
// dismissals from the previous implementation are still honored.
const DISMISS_COOKIE = 'stride_cookie_ack'
const DISMISS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const LEGACY_DISMISS_KEY = 'stride_cookie_notice_dismissed'

// Tiny external store over localStorage so visibility can be read via
// useSyncExternalStore: the server snapshot reports "dismissed" (render
// nothing during SSR/hydration), the client snapshot reads the real value.
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

// In-memory fallback so OK still hides the banner when storage is
// unavailable (private mode) — it just won't persist across reloads.
let dismissedThisSession = false

function isDismissed(): boolean {
  if (dismissedThisSession) return true
  try {
    if (document.cookie.split('; ').includes(`${DISMISS_COOKIE}=1`)) return true
  } catch {
    // Cookies unavailable — fall through to the legacy check.
  }
  try {
    return window.localStorage.getItem(LEGACY_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function dismiss() {
  dismissedThisSession = true
  try {
    document.cookie = `${DISMISS_COOKIE}=1; max-age=${DISMISS_COOKIE_MAX_AGE}; path=/; samesite=lax`
  } catch {
    // Best-effort persistence only — the in-memory flag still hides it now.
  }
  listeners.forEach(listener => listener())
}

export function CookieNotice() {
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true)
  // On mobile, hold the notice back until the visitor scrolls past the first
  // fold so it doesn't compete with the hero CTA. Desktop shows immediately.
  const revealed = useRevealAfterFold()
  if (dismissed || !revealed) return null

  return (
    <div
      role='region'
      aria-label='Cookie notice'
      className='animate-fade-in-up fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-90 bg-stride-purple-primary/80 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl px-4 py-3.5'
    >
      <div className='flex items-start gap-3'>
        <Cookie size={16} className='text-stride-yellow-accent shrink-0 mt-0.5' aria-hidden='true' />
        <p className='text-white/80 text-xs leading-relaxed'>
          We use essential cookies to keep you signed in, and analytics cookies to
          understand how the site is used. No ads.{' '}
          <Link
            href='/privacy-policy#cookie-policy'
            className='text-stride-yellow-accent hover:underline underline-offset-2'
          >
            Read our cookie policy
          </Link>
        </p>
        <button
          type='button'
          onClick={dismiss}
          className='shrink-0 bg-stride-yellow-accent text-copy-black text-xs font-semibold px-4 rounded-md hover:bg-stride-yellow-accent/90 active:scale-95 active:bg-stride-yellow-accent/80 transition-all duration-100 min-h-11 touch-manipulation'
        >
          OK
        </button>
      </div>
    </div>
  )
}
