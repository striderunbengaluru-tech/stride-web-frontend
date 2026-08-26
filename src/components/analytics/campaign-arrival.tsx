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

/**
 * Campaign tag (`utm_campaign`) to the name shown in Vercel's Events panel.
 *
 * The name is looked up here rather than built from the URL. Event names are the
 * top-level grouping in the dashboard and the panel lists every name ever sent,
 * so deriving one from an attacker-controlled query string would let anyone
 * permanently add rows to that list by sharing a crafted link. An unrecognised
 * tag lands in a single bucket instead, with the raw slug kept as a property so
 * it stays visible.
 *
 * Add a line here when a new campaign goes out. The key is the tag in the link;
 * the value is what you want to read in the dashboard, which is not always the
 * same thing — this event's slug still says "rave" while the mail calls it a
 * festival.
 */
const CAMPAIGN_EVENT_NAMES: Record<string, string> = {
  'map-fitness-rave': 'Email: MAP Fitness Festival',
}

/** Everything whose tag is not in the table above, kept to one row. */
const UNMAPPED_EVENT_NAME = 'Campaign arrival (unmapped tag)'

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

    // Pro allows two properties per event. A recognised campaign spends them on
    // where the click came from; an unrecognised one spends one naming itself,
    // since its tag is not in the event name.
    const eventName = CAMPAIGN_EVENT_NAMES[campaign] ?? UNMAPPED_EVENT_NAME
    const slot = safeTag(params.get('utm_content')) ?? 'unspecified'
    const properties = eventName === UNMAPPED_EVENT_NAME
      ? { campaign, slot }
      : { source: safeTag(params.get('utm_source')) ?? 'unspecified', slot }

    let attempts = 0
    let timer = 0

    const sendWhenReady = () => {
      if (typeof window.va === 'function') {
        track(eventName, properties)
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
