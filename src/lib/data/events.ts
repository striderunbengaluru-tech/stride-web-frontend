import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'

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

// Every column the detail page + metadata need — replaces select('*'), which
// pulled the full wide row (details/terms markdown etc. are needed; unused
// audit columns are not).
const EVENT_DETAIL_COLUMNS =
  'id, name, slug, subtitle, details, status, event_date, end_date, location, location_url, ' +
  'post_run_location, post_run_location_url, strava_route_url, capacity, price_paise, ' +
  'cover_url, banner_images, additional_fields, terms_and_conditions, distance_km, ' +
  'difficulty, show_spots_left'

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
}

export const getEventBySlug = cache((slug: string): Promise<EventDetailRow | null> =>
  unstable_cache(
    async () => {
      const { data } = await adminClient
        .from('events')
        .select(EVENT_DETAIL_COLUMNS)
        .eq('slug', slug)
        .single()
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

export const getPublishedEvents = cache((): Promise<EventListRow[]> =>
  unstable_cache(
    async () => {
      const { data } = await adminClient
        .from('events')
        .select('id, name, subtitle, slug, event_date, location, price_paise, cover_url, banner_images')
        .eq('status', 'PUBLISHED')
        .order('event_date', { ascending: true })
      return (data ?? []) as EventListRow[]
    },
    ['published-events'],
    { tags: [EVENTS_TAG], revalidate: EVENTS_LIST_REVALIDATE }
  )()
)
