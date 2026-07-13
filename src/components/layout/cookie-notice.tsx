'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'

// DPDP transparency notice: the site sets only strictly necessary cookies, so
// no consent gating is required — this banner informs and links to the Cookie
// Policy. Dismissal lives in localStorage (never expires, never sent to the
// server; a dismissal *cookie* would ironically be one more cookie).
const DISMISS_KEY = 'stride_cookie_notice_dismissed'

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
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function dismiss() {
  dismissedThisSession = true
  try {
    window.localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // Best-effort persistence only.
  }
  listeners.forEach(listener => listener())
}

export function CookieNotice() {
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true)
  if (dismissed) return null

  return (
    <div
      role='region'
      aria-label='Cookie notice'
      className='fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-90 bg-stride-purple-primary/80 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl px-4 py-3.5'
    >
      <div className='flex items-start gap-3'>
        <Cookie size={16} className='text-stride-yellow-accent shrink-0 mt-0.5' aria-hidden='true' />
        <p className='text-white/80 text-xs leading-relaxed'>
          We only use essential cookies to keep you signed in — no tracking, no ads.{' '}
          <Link
            href='/privacy-policy#cookie-policy'
            className='text-stride-yellow-accent hover:underline underline-offset-2'
          >
            Learn more
          </Link>
        </p>
        <button
          type='button'
          onClick={dismiss}
          className='shrink-0 bg-stride-yellow-accent text-copy-black text-xs font-semibold px-4 rounded-md hover:bg-stride-yellow-accent/90 transition-colors min-h-11'
        >
          OK
        </button>
      </div>
    </div>
  )
}
