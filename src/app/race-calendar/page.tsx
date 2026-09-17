import { Suspense } from 'react'
import type { Metadata } from 'next'
import { DEFAULT_OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from '@/lib/seo'
import { getPublishedRaces } from '@/lib/data/races'
import { toRaceCardData, distinctCities, type RaceCardData } from '@/lib/races/present'
import { istDayKey } from '@/lib/utils/ist'
import { RaceCalendarClient } from '@/components/race-calendar/race-calendar-client'
import { RaceList } from '@/components/race-calendar/race-list'
import { NextRaceHero } from '@/components/race-calendar/next-race-hero'
import { TrackBackdrop } from '@/components/ui/track-backdrop'
import { JsonLd } from '@/components/seo/json-ld'
import { graph, raceListNode, breadcrumbNode } from '@/lib/json-ld'
import { listRaces } from '@/lib/mcp/data'
import { PRODUCTION_SITE_URL } from '@/lib/site-url'

// Title omits the brand: the root layout's template appends it.
export const metadata: Metadata = {
  title: 'Race Calendar',
  description:
    'Upcoming running races in and around Bengaluru, curated by Stride Run Club — 5K to ultra, with dates, cities, registration links and Stride coupon codes.',
  keywords: ['race calendar', 'marathon Bengaluru', 'half marathon calendar India', '10K races', 'running races 2026', 'race coupon code'],
  alternates: { canonical: '/race-calendar', types: { 'text/markdown': '/race-calendar.md' } },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Stride Run Club',
    url: '/race-calendar',
    title: 'Race Calendar — Stride Run Club',
    description: 'Every race worth training for, in one calendar. Dates, distances, registration links and Stride coupon codes.',
    images: [{ url: DEFAULT_OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: 'Stride Run Club — race calendar' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Race Calendar — Stride Run Club',
    description: 'Every race worth training for, in one calendar.',
    images: [DEFAULT_OG_IMAGE],
  },
}

// ISR, purged on demand by the admin race actions via the 'races' tag.
export const revalidate = 60

const JSON_LD_LIMIT = 100

async function fetchCalendar(): Promise<{ races: RaceCardData[]; cities: string[]; todayKey: string; nowIso: string }> {
  const rows = await getPublishedRaces()
  const races = rows.map(toRaceCardData)
  const nowIso = new Date().toISOString()
  return { races, cities: distinctCities(races), todayKey: istDayKey(nowIso), nowIso }
}

export default async function RaceCalendarPage() {
  const { races, cities, todayKey, nowIso } = await fetchCalendar()

  const { races: publicRaces } = await listRaces({ when: 'upcoming', limit: JSON_LD_LIMIT }, false)
  const jsonLd = graph([
    raceListNode(PRODUCTION_SITE_URL, publicRaces),
    breadcrumbNode(PRODUCTION_SITE_URL, [{ name: 'Race calendar', path: '/race-calendar' }]),
  ])

  // The default view, rendered on the server. It is the Suspense fallback for
  // the client below (which reads the URL and so client-renders), so crawlers
  // and no-JS visitors still receive every upcoming race.
  const upcoming = races.filter(r => r.dayKey >= todayKey)
  const past = races.filter(r => r.dayKey < todayKey).reverse()
  const nextRace = upcoming[0] ?? null
  const cityCount = cities.length

  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-hidden'>
      <JsonLd data={jsonLd} />
      <TrackBackdrop />

      <section className='relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-24'>
        {/* Header: the serif does the talking; one line of copy, then the next race. */}
        <div className='mb-10 sm:mb-14 grid grid-cols-1 lg:grid-cols-[1fr_auto] lg:items-end gap-6'>
          <div>
            <p className='text-white/50 text-sm font-medium'>Race calendar</p>
            <h1 className='text-5xl sm:text-6xl lg:text-7xl text-white leading-none tracking-tight mt-3 text-balance max-w-3xl'>
              Every start line worth training for.
            </h1>
            <p className='text-white/55 text-lg mt-5 max-w-xl leading-relaxed'>
              Races across India the Stride team is watching, with the organiser&apos;s registration link and any coupon code we hold for you.
            </p>
          </div>
          {upcoming.length > 0 && (
            <p className='text-white/45 text-sm font-mono lg:text-right lg:pb-2'>
              {upcoming.length} upcoming {upcoming.length === 1 ? 'race' : 'races'}
              {cityCount > 1 ? ` across ${cityCount} cities` : ''}
            </p>
          )}
        </div>

        {nextRace && (
          <div className='mb-12 sm:mb-16'>
            <NextRaceHero race={nextRace} todayKey={todayKey} nowIso={nowIso} />
          </div>
        )}

        <Suspense fallback={<RaceList upcoming={upcoming} past={past} todayKey={todayKey} nowIso={nowIso} />}>
          <RaceCalendarClient races={races} cities={cities} todayKey={todayKey} nowIso={nowIso} />
        </Suspense>
      </section>
    </main>
  )
}
