'use client'

import { useEffect, useRef } from 'react'
import { track } from '@vercel/analytics'

/**
 * Reports an arrival from a UTM-tagged link as a Vercel custom event.
 *
 * Why this exists: Vercel gates UTM-parameter filtering behind the Web
 * Analytics Plus add-on, and this team is on plain Pro, where the pricing table
 * lists it as N/A. Custom Events *are* included on Pro, so the tags are read
 * here and re-reported as an event the dashboard can group by. Without this the
 * `?utm_*` query string is simply dropped: the Pages panel keys on pathname.
 *
 * Reads `window.location.search` rather than `useSearchParams()` deliberately.
 * The event pages are ISR (`revalidate = 60` with `generateStaticParams`), and
 * `useSearchParams()` in a client component opts the route out of its static
 * shell unless it sits behind its own Suspense boundary. The query string is
 * only wanted after hydration, so the browser API costs nothing and keeps the
 * prerender intact.
 *
 * Mounted once in the root layout, so any tagged link to any page is counted.
 */

/** Vercel's Pro tier allows two properties per custom event. */
const EVENT_NAME = 'campaign-arrival'

/**
 * `track()` is `window.va?.(...)` — if the analytics queue is not installed yet
 * the call is silently dropped, with no error and no retry.
 *
 * That is not hypothetical here. `<Analytics />` from `@vercel/analytics/next`
 * renders its real component inside its own `<Suspense fallback={null}>` (it
 * reads the route with `useSearchParams`), and `window.va` is only defined by
 * the `inject()` call in that inner component's effect. This component is not
 * inside a Suspense boundary, so its effect commits first — and every event
 * fired at that moment goes nowhere.
 *
 * So wait for the queue instead of firing into a void. Bounded, because an ad
 * blocker or a disabled Web Analytics project means it will never appear, and
 * silently giving up is the right outcome there.
 */
const QUEUE_POLL_MS = 250
const QUEUE_MAX_ATTEMPTS = 20 // ~5s

/**
 * The query string is attacker-controlled: anyone can append
 * `?utm_campaign=<anything>` and, unbounded, mint a new dashboard row per
 * visit. Values are lowercased, stripped to the characters a real campaign tag
 * uses, and capped, so the worst a crafted URL can do is add one short junk row
 * rather than flood the panel.
 */
const MAX_TAG_LENGTH = 40

function safeTag(raw: string | null): string | null {
  if (!raw) return null
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, MAX_TAG_LENGTH)
  return cleaned.length > 0 ? cleaned : null
}

export function CampaignArrival() {
  // Effects run twice in development under StrictMode, and one arrival should
  // report once.
  const reported = useRef(false)

  useEffect(() => {
    if (reported.current) return

    const params = new URLSearchParams(window.location.search)
    const campaign = safeTag(params.get('utm_campaign'))

    // No tag means an organic visit. Reporting those would double-count every
    // page view against the plan's event allowance for no insight.
    if (!campaign) return

    reported.current = true
    const slot = safeTag(params.get('utm_content')) ?? 'unspecified'

    let attempts = 0
    let timer = 0

    const sendWhenReady = () => {
      if (typeof window.va === 'function') {
        track(EVENT_NAME, { campaign, slot })
        return
      }
      if (attempts++ >= QUEUE_MAX_ATTEMPTS) return
      timer = window.setTimeout(sendWhenReady, QUEUE_POLL_MS)
    }

    sendWhenReady()
    return () => window.clearTimeout(timer)
  }, [])

  return null
}
