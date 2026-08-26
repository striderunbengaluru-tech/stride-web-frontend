'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'

// Google Analytics 4.
//
// Hand-rolled on next/script rather than @next/third-parties/google, for two
// reasons: it needs no new dependency, and it keeps the script ordering visible
// here. If a consent gate is ever added, the `gtag('consent', 'default', …)`
// call has to run BEFORE the loader below — that seam only exists if the two
// tags are written out explicitly.
//
// Three conditions gate it, and all three matter:
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
// describing that accurately — they are part of this feature, not documentation
// of it.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
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

  const configured = IS_PRODUCTION && MEASUREMENT_ID_SHAPE.test(GA_ID)
  const onAdmin = pathname?.startsWith(ADMIN_PREFIX) ?? false
  const active = configured && !onAdmin

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
