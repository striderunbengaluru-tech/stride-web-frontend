import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'
import { PREVIEW_FEATURES_ENABLED } from '@/lib/feature-flags'

// Events flagged `is_test_event` exist so features can be exercised against real
// data without the live site showing them. They resolve normally on staging,
// previews and local dev, and are invisible on the production deployment — this
// is the single place that decision is made.
const SHOW_TEST_EVENTS = PREVIEW_FEATURES_ENABLED

// Cached event reads shared by the events pages. Two layers:
// - unstable_cache: cross-request cache with tags, so pages don't hit the DB
//   on every request. Tags are purged on-demand by the registration APIs and
//   the admin event actions, so staleness windows only apply between writes.
// - React cache(): per-request dedupe, so generateMetadata and the page body
//   share one fetch instead of querying the same row twice.

export const EVENTS_TAG = 'events'
export const eventTag = (slug: string) => `event:${slug}`
export const eventRegsTag = (eventId: string) => `event-regs:${eventId}`

const EVENTS_LIST_REVALIDATE = 60
const EVENT_DETAIL_REVALIDATE = 60
const CONFIRMED_COUNT_REVALIDATE = 30
// An in-checkout PENDING registration reserves its spot for this long, matching
// the window register_for_event enforces.
const PENDING_HOLD_MS = 15 * 60 * 1000

// Every column the detail page + metadata need — replaces select('*'), which
// pulled the full wide row (details/terms markdown etc. are needed; unused
// audit columns are not).
const EVENT_DETAIL_COLUMNS =
  'id, name, slug, subtitle, details, status, event_date, end_date, location, location_url, ' +
  'post_run_location, post_run_location_url, strava_route_url, capacity, price_paise, ' +
  'cover_url, banner_images, additional_fields, terms_and_conditions, distance_km, ' +
  'difficulty, show_spots_left, is_test_event, packages, packages_enabled, packages_multi_select'

export type EventDetailRow = {
  id: string
  name: string
  slug: string
  subtitle: string | null
  details: string | null
  status: string | null
  event_date: string | null
  end_date: string | null
  location: string | null
  location_url: string | null
  post_run_location: string | null
  post_run_location_url: string | null
  strava_route_url: string | null
  capacity: number | null
  price_paise: number
  cover_url: string | null
  banner_images: string | null
  additional_fields: string | null
  terms_and_conditions: string | null
  distance_km: number | null
  difficulty: string | null
  show_spots_left: boolean | null
  is_test_event: boolean | null
  /** JSON array of EventPackage. When packages_enabled, these set the price. */
  packages: string | null
  packages_enabled: boolean | null
  packages_multi_select: boolean | null
}

export type EventListRow = {
  id: string
  name: string
  subtitle: string | null
  slug: string
  event_date: string | null
  location: string | null
  price_paise: number
  cover_url: string | null
  banner_images: string | null
  is_test_event: boolean | null
}

export const getEventBySlug = cache((slug: string): Promise<EventDetailRow | null> =>
  unstable_cache(
    async () => {
      const query = adminClient
        .from('events')
        .select(EVENT_DETAIL_COLUMNS)
        .eq('slug', slug)
      // On production a test event's page must 404, not render — returning null
      // lets the page's existing notFound() handle it.
      if (!SHOW_TEST_EVENTS) query.eq('is_test_event', false)

      const { data } = await query.single()
      return (data as EventDetailRow | null) ?? null
    },
    ['event-by-slug', slug],
    { tags: [eventTag(slug), EVENTS_TAG], revalidate: EVENT_DETAIL_REVALIDATE }
  )()
)

export const getConfirmedCount = cache((eventId: string): Promise<number> =>
  unstable_cache(
    async () => {
      const { count } = await adminClient
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'CONFIRMED')
      return count ?? 0
    },
    ['event-confirmed-count', eventId],
    { tags: [eventRegsTag(eventId)], revalidate: CONFIRMED_COUNT_REVALIDATE }
  )()
)

/**
 * How many spots each package of an event has taken, keyed by package id.
 *
 * Counts CONFIRMED registrations plus PENDING holds younger than the 15-minute
 * checkout window — the same definition register_for_event enforces, so the
 * "N left" the runner sees matches what the RPC will actually allow.
 *
 * Tagged with eventRegsTag, so every existing purge in the registration APIs and
 * the admin event actions already refreshes it. No new invalidation wiring.
 */
export const getPackageSpotsTaken = cache((eventId: string): Promise<Record<string, number>> =>
  unstable_cache(
    async () => {
      const { data } = await adminClient
        .from('event_registrations')
        .select('status, created_at, selected_packages')
        .eq('event_id', eventId)
        .not('selected_packages', 'is', null)

      const cutoff = Date.now() - PENDING_HOLD_MS
      const taken: Record<string, number> = {}

      for (const row of data ?? []) {
        const holds = row.status === 'CONFIRMED'
          || (row.status === 'PENDING' && new Date(row.created_at as string).getTime() > cutoff)
        if (!holds) continue

        try {
          const chosen = JSON.parse(row.selected_packages as string) as { id: string }[]
          if (!Array.isArray(chosen)) continue
          for (const pkg of chosen) taken[pkg.id] = (taken[pkg.id] ?? 0) + 1
        } catch { continue }
      }

      return taken
    },
    ['event-package-spots-taken', eventId],
    { tags: [eventRegsTag(eventId)], revalidate: CONFIRMED_COUNT_REVALIDATE }
  )()
)

export const getPublishedEvents = cache((): Promise<EventListRow[]> =>
  unstable_cache(
    async () => {
      const query = adminClient
        .from('events')
        .select('id, name, subtitle, slug, event_date, location, price_paise, cover_url, banner_images, is_test_event')
        .eq('status', 'PUBLISHED')
      if (!SHOW_TEST_EVENTS) query.eq('is_test_event', false)

      const { data } = await query.order('event_date', { ascending: true })
      return (data ?? []) as EventListRow[]
    },
    ['published-events'],
    { tags: [EVENTS_TAG], revalidate: EVENTS_LIST_REVALIDATE }
  )()
)
