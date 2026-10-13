'use client'

import { useSyncExternalStore } from 'react'
import {
  clearAnalyticsOptOut,
  isAnalyticsOptedOut,
  optOutOfAnalytics,
  subscribeAnalyticsChoice,
} from '@/lib/analytics-consent'

// The always-available way to change the analytics choice after the cookie
// notice has been dismissed. Same store as CookieNotice and GoogleAnalytics
// (src/lib/analytics-consent.ts), so flipping it here starts or stops GA on the
// spot. Analytics is on unless opted out — see that module for why.
//
// A client island so the footer itself stays a static server component. The
// server snapshot is null ("not known yet"): rather than render a guess that
// flips after hydration, it holds an invisible placeholder of the same size.
export function FooterAnalyticsToggle() {
  const optedOut = useSyncExternalStore<boolean | null>(
    subscribeAnalyticsChoice,
    isAnalyticsOptedOut,
    () => null,
  )

  const className =
    'min-h-11 text-white/70 text-xs font-figtree hover:text-stride-yellow-accent transition-colors duration-150 text-left'

  if (optedOut === null) {
    return <span aria-hidden='true' className={`${className} invisible inline-flex items-center`}>Analytics: Off</span>
  }

  return (
    <button
      type='button'
      onClick={optedOut ? clearAnalyticsOptOut : optOutOfAnalytics}
      aria-label={optedOut ? 'Analytics cookies are off. Turn them on.' : 'Analytics cookies are on. Turn them off.'}
      className={className}
    >
      Analytics: {optedOut ? 'Off' : 'On'}
    </button>
  )
}
