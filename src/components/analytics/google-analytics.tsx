'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { isAnalyticsOptedOut, subscribeAnalyticsChoice } from '@/lib/analytics-consent'

// Google Analytics 4.
//
// Hand-rolled on next/script rather than @next/third-parties/google, for two
// reasons: it needs no new dependency, and it keeps the script ordering visible
// here. If a consent gate is ever added, the `gtag('consent', 'default', …)`
// call has to run BEFORE the loader below — that seam only exists if the two
// tags are written out explicitly.
//
// Four conditions gate it, and all four matter:
//
//   1. PRODUCTION ONLY. Staging shares this codebase and the same Supabase
//      project, so without this every internal click would land in the same
//      property and quietly inflate the numbers the club decides on. Same test
//      as PREVIEW_FEATURES_ENABLED in src/lib/feature-flags.ts, spelled out
//      rather than imported so the reason lives next to the tag.
//   2. NOT ON /admin. Admin traffic is six people doing operations work; it is
//      noise in every report, and admin paths carry event and registration ids
//      that have no business in a third-party analytics product.
//   3. A well-formed measurement id.
//   4. THE VISITOR HASN'T OPTED OUT. Analytics is ON BY DEFAULT and can be
//      switched off from the cookie notice or the footer toggle (one shared
//      store: src/lib/analytics-consent.ts). This opt-out model is a known,
//      deliberate deviation from legal advice, which recommended prior opt-in
//      consent before setting non-essential cookies. The choice is read through
//      useSyncExternalStore with an "opted out" server snapshot, so nothing
//      renders during SSR or hydration and the loader is only ever injected
//      after the real cookie has been read on the client. Opting out mid-session
//      also sets `window['ga-disable-<id>']`, Google's documented kill switch,
//      because a loader that has already run can't be un-run by unmounting.
//
// PAGE VIEWS ARE SENT MANUALLY — `send_page_view: false` below, then one
// `page_view` per pathname from the effect. Two reasons. GA4's Enhanced
// Measurement watches browser history events, which double-counts in the App
// Router; and it would keep firing on /admin after a client-side navigation from
// a public page, so merely unmounting the tag would not actually exclude admin.
// Sending them ourselves makes the exclusion real rather than cosmetic.
//
// NOTE: GA4 sets `_ga` / `_ga_<id>` cookies, which are NOT strictly necessary.
// Section 5 of the privacy policy and the copy in CookieNotice both have to keep
// describing that — including that they run unless the visitor opts out. They
// are part of this feature, not documentation of it.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    /** GA's per-property kill switch: when true, gtag sends nothing. */
    [gaDisableKey: `ga-disable-${string}`]: boolean | undefined
  }
}

/**
 * The club's GA4 web stream.
 *
 * Hardcoded rather than required from the environment. A measurement id is not a
 * secret — it ships in the client bundle of every GA site and is readable in any
 * page source — so keeping it here removes a Vercel step and, more usefully, the
 * failure mode where someone forgets that step and analytics silently never runs.
 *
 * The env var still wins if set, so a second property can be pointed at a
 * preview deploy without touching this file.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-E97SRBZCES'
const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'

/**
 * A measurement id is `G-` followed by alphanumerics. Checked because the value
 * is interpolated into an inline script below: it comes from our own config
 * rather than a user, but a typo containing a quote would otherwise break the
 * page silently, and validating is cheaper than trusting.
 */
const MEASUREMENT_ID_SHAPE = /^G-[A-Z0-9]{4,20}$/

const ADMIN_PREFIX = '/admin'

export function GoogleAnalytics() {
  const pathname = usePathname()
  // Server snapshot is "opted out", so SSR and the hydration pass render nothing
  // and the page_view effect stays inert until the real cookie has been read.
  const optedOut = useSyncExternalStore(subscribeAnalyticsChoice, isAnalyticsOptedOut, () => true)

  const configured = IS_PRODUCTION && MEASUREMENT_ID_SHAPE.test(GA_ID)
  const onAdmin = pathname?.startsWith(ADMIN_PREFIX) ?? false
  const active = configured && !onAdmin && !optedOut

  // The last path reported, so the entry page cannot be counted twice.
  //
  // On first load there is a race: the effect below and the loader's onLoad can
  // fire in either order, and whichever runs first is the one that reports.
  // Without this ref, an unlucky ordering double-counts every session's landing
  // page — which would quietly inflate exactly the number this is installed to
  // measure.
  const lastReported = useRef<string | null>(null)

  const report = (path: string) => {
    if (lastReported.current === path) return
    // Optional-called: before the loader has executed there is no gtag, and the
    // onLoad handler will report this same path a moment later.
    if (typeof window.gtag !== 'function') return
    window.gtag('event', 'page_view', { page_path: path })
    lastReported.current = path
  }

  // Mirrors the choice into GA's own kill switch. Matters only once the loader
  // has run: opting out mid-session must silence a gtag that's already live,
  // and opting back in must lift the switch for the loader to report again.
  // Hydration may briefly write `true` from the server snapshot before the real
  // value lands; that's harmless, since no loader exists yet to be silenced.
  useEffect(() => {
    if (!configured) return
    window[`ga-disable-${GA_ID}`] = optedOut
  }, [configured, optedOut])

  useEffect(() => {
    if (!active || !pathname) return
    report(pathname)
    // `report` is deliberately not a dependency: it is redefined every render but
    // closes over nothing that changes within one, and the ref is what carries
    // state across renders.
  }, [active, pathname])

  if (!active) return null

  return (
    <>
      <Script
        id='ga-loader'
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy='afterInteractive'
        // Covers the case where the loader lands after the first effect, which is
        // the usual order — the effect finds no gtag and defers to this.
        onLoad={() => { if (pathname) report(pathname) }}
      />
      <Script id='ga-init' strategy='afterInteractive'>
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: false });`}
      </Script>
    </>
  )
}
