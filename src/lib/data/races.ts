import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'
import type { RaceRow } from '@/types/race'

// Cached race reads shared by the public race calendar, its detail pages and
// every discovery surface (markdown twin, MCP, feeds). Same two layers as
// src/lib/data/events.ts: unstable_cache with tags across requests, React
// cache() within one. The admin race actions purge the tags on every write.

export const RACES_TAG = 'races'
export const raceTag = (slug: string) => `race:${slug}`

const RACES_REVALIDATE = 60

// Every column the public surfaces need. Attribution and created_at stay behind;
// updated_at is included for sitemap lastModified.
const RACE_PUBLIC_COLUMNS =
  'id, name, slug, description, poster_images, race_date, has_start_time, city, venue, ' +
  'organizer, distances, registration_url, coupon_code, registration_deadline, status, updated_at'

/** Every PUBLISHED race, past and future, soonest first. Callers split on IST day. */
export const getPublishedRaces = cache((): Promise<RaceRow[]> =>
  unstable_cache(
    async () => {
      const { data } = await adminClient
        .from('races')
        .select(RACE_PUBLIC_COLUMNS)
        .eq('status', 'PUBLISHED')
        .order('race_date', { ascending: true })
      // No generated DB types in this project, so a column list held in a
      // constant leaves supabase-js unable to infer the row shape.
      return (data ?? []) as unknown as RaceRow[]
    },
    ['published-races'],
    { tags: [RACES_TAG], revalidate: RACES_REVALIDATE }
  )()
)

/**
 * One PUBLISHED race by slug. The status filter is in the query, not left to
 * the page: a draft must be unreachable, not merely un-rendered.
 */
export const getRaceBySlug = cache((slug: string): Promise<RaceRow | null> =>
  unstable_cache(
    async () => {
      const { data } = await adminClient
        .from('races')
        .select(RACE_PUBLIC_COLUMNS)
        .eq('slug', slug)
        .eq('status', 'PUBLISHED')
        .maybeSingle()
      return (data as unknown as RaceRow | null) ?? null
    },
    ['race-by-slug', slug],
    { tags: [raceTag(slug), RACES_TAG], revalidate: RACES_REVALIDATE }
  )()
)
