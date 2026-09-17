import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, MapPin, Gauge, Building2, Hourglass } from 'lucide-react'
import { getRaceBySlug, getPublishedRaces } from '@/lib/data/races'
import { getRace as getPublicRace } from '@/lib/mcp/data'
import { toRaceCardData, isRegistrationOpen } from '@/lib/races/present'
import { deadlineLabel } from '@/components/race-calendar/race-card'
import { RaceDetailCtas } from '@/components/race-calendar/race-detail-ctas'
import { EventHero } from '@/components/events/event-hero'
import { Reveal } from '@/components/ui/reveal'
import { ShareButton } from '@/components/events/share-button'
import { TrackBackdrop } from '@/components/ui/track-backdrop'
import { JsonLd } from '@/components/seo/json-ld'
import { RaceTools } from '@/components/webmcp/page-tools'
import { graph, raceEventNode, breadcrumbNode } from '@/lib/json-ld'
import { PRODUCTION_SITE_URL } from '@/lib/site-url'
import { formatDateLongIST, formatTimeIST, formatMonthIST, formatDayIST, formatDateTimeIST, istDayKey } from '@/lib/utils/ist'
import { markdownToPlainText } from '@/lib/utils/markdown-text'
import { distanceLabel, sortDistances } from '@/types/race'

type Props = { params: Promise<{ slug: string }> }

// ISR like the events pages; `registrationOpen` and "closes in N days" are
// evaluated at render time and can lag by up to the revalidation window.
export const revalidate = 60

const DESCRIPTION_EXCERPT_LENGTH = 160

/** Register every published race at build time so the ISR family exists — see events/[slug]. */
export async function generateStaticParams() {
  const races = await getPublishedRaces()
  return races.map(race => ({ slug: race.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const race = await getRaceBySlug(slug)
  if (!race) return {}

  const title = `${race.name} — Race Calendar`
  const distances = sortDistances(race.distances).map(distanceLabel).join(', ')
  const description = race.description
    ? markdownToPlainText(race.description).slice(0, DESCRIPTION_EXCERPT_LENGTH)
    : `${race.name} — a ${distances} race in ${race.city} on ${formatDateLongIST(race.race_date)}.`
  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_SITE_URL}/race-calendar/${slug}`
  const ogImage = race.poster_images[0] ?? null

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl, types: { 'text/markdown': `/race-calendar/${slug}.md` } },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      siteName: 'Stride Run Club',
      title,
      description,
      images: ogImage ? [{ url: ogImage, alt: `${race.name} poster` }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

async function fetchRace(slug: string) {
  const race = await getRaceBySlug(slug)
  if (!race) return null
  const nowIso = new Date().toISOString()
  return { race, card: toRaceCardData(race), nowIso, todayKey: istDayKey(nowIso) }
}

export default async function RaceDetailPage({ params }: Props) {
  const { slug } = await params
  const data = await fetchRace(slug)
  if (!data) notFound()
  const { race, card, nowIso, todayKey } = data

  const open = isRegistrationOpen(card, todayKey, nowIso)
  const deadline = deadlineLabel(card, todayKey, nowIso)
  const where = [race.venue, race.city].filter(Boolean).join(', ')
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_SITE_URL}/race-calendar/${slug}`

  const publicRace = await getPublicRace(slug, false)
  const jsonLd = publicRace
    ? graph([
        raceEventNode(PRODUCTION_SITE_URL, publicRace),
        breadcrumbNode(PRODUCTION_SITE_URL, [
          { name: 'Race calendar', path: '/race-calendar' },
          { name: race.name, path: `/race-calendar/${slug}` },
        ]),
      ])
    : null

  const backLink = (
    <Link href='/race-calendar' className='inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors group min-h-11'>
      <ArrowLeft size={14} className='group-hover:-translate-x-0.5 transition-transform' aria-hidden='true' />
      Race calendar
    </Link>
  )

  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-clip pb-36 sm:pb-20'>
      {jsonLd && <JsonLd data={jsonLd} />}
      {publicRace && <RaceTools race={publicRace} />}
      <TrackBackdrop />

      <div className='relative z-10 lg:flex lg:pt-28 lg:max-w-6xl lg:mx-auto lg:gap-10 lg:px-6'>
        {/* ── LEFT: poster ── */}
        <div className='w-full lg:w-[42%] shrink-0 pt-24 lg:pt-0'>
          <div className='lg:hidden px-5 pb-3'>{backLink}</div>
          {race.poster_images.length > 0 ? (
            <EventHero images={race.poster_images} eventName={race.name} />
          ) : (
            <div className='relative w-full aspect-[3/4] rounded-md flex items-center justify-center'>
              <span className='text-white/10 text-7xl select-none'>🏁</span>
            </div>
          )}
        </div>

        {/* ── RIGHT: content ── */}
        <div className='flex-1 min-w-0 px-5 sm:px-8 lg:px-0 pt-6 lg:pt-0 lg:pb-20'>
          <div className='hidden lg:block mb-6'>{backLink}</div>

          <Reveal>
            <span className='inline-flex items-center rounded-full bg-white/8 border border-white/15 px-2.5 py-1 text-[10px] font-bold font-mono uppercase tracking-widest text-white/60'>
              Third-party race
            </span>
            <h1 className='text-4xl sm:text-5xl font-bold text-white leading-[1.05] tracking-tight mt-3'>{race.name}</h1>
            {race.organizer && (
              <p className='text-white/55 text-lg mt-3 flex items-center gap-2'>
                <Building2 size={16} className='shrink-0 text-white/35' aria-hidden='true' />
                Organised by {race.organizer}
              </p>
            )}
            {race.distances.length > 0 && (
              <ul className='flex flex-wrap gap-2 mt-4 list-none m-0 p-0' aria-label='Distances'>
                {sortDistances(race.distances).map(d => (
                  <li key={d} className='inline-flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-full px-3 py-1 text-white/80 text-xs font-semibold'>
                    <Gauge size={12} className='text-stride-yellow-accent' aria-hidden='true' />
                    {distanceLabel(d)}
                  </li>
                ))}
              </ul>
            )}
          </Reveal>

          {/* When & Where */}
          <Reveal>
            <div className='mt-7 rounded-2xl border border-white/10 bg-white/4 overflow-hidden'>
              <div className='flex items-start gap-4 px-5 py-4 border-b border-white/8'>
                <div className='w-11 h-11 rounded-xl bg-white/8 border border-white/12 flex flex-col items-center justify-center shrink-0 leading-none gap-0.5 mt-0.5'>
                  <span className='text-stride-yellow-accent text-[8px] font-black font-mono uppercase tracking-widest'>{formatMonthIST(race.race_date)}</span>
                  <span className='text-white font-bold text-base leading-none font-mono'>{formatDayIST(race.race_date)}</span>
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest mb-0.5'>When</p>
                  <p className='text-white font-semibold text-base font-mono'>{formatDateLongIST(race.race_date)}</p>
                  <p className='text-white/60 text-sm mt-1 font-mono'>
                    {race.has_start_time ? `Starts ${formatTimeIST(race.race_date)} IST` : 'Start time to be announced by the organiser'}
                  </p>
                </div>
              </div>
              <div className='flex items-start gap-4 px-5 py-4'>
                <div className='w-11 h-11 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center shrink-0 mt-0.5'>
                  <MapPin size={15} className='text-white/50' aria-hidden='true' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest mb-0.5'>Where</p>
                  <p className='text-white font-semibold text-base'>{where}</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Registration */}
          <Reveal>
            <div className='mt-3 rounded-2xl border border-white/15 bg-white/3 overflow-hidden'>
              <div className='px-5 py-3 border-b border-white/8 flex items-center justify-between gap-3'>
                <p className='text-white/50 text-xs font-bold font-mono uppercase tracking-widest'>Registration</p>
                {deadline && (
                  <p className={`inline-flex items-center gap-1.5 text-xs font-bold font-mono ${deadline.urgent ? 'text-stride-yellow-accent' : 'text-white/50'}`}>
                    <Hourglass size={12} aria-hidden='true' />
                    {deadline.text}
                  </p>
                )}
              </div>
              <div className='px-5 py-5 space-y-3'>
                {race.registration_deadline && open && (
                  <p className='text-white/55 text-sm'>Registrations close {formatDateTimeIST(race.registration_deadline)} IST.</p>
                )}
                <RaceDetailCtas registrationUrl={race.registration_url} couponCode={race.coupon_code} open={open} />
                <p className='text-white/35 text-xs leading-relaxed'>
                  Stride doesn&apos;t organise this race or take payment for it. Registration, fees and refunds are handled by the organiser.
                </p>
              </div>
            </div>
          </Reveal>

          {race.description && (
            <Reveal>
              <div className='mt-8'>
                <p className='text-white/40 text-xs font-bold font-mono uppercase tracking-widest mb-4'>About the race</p>
                <div className='prose prose-invert prose-sm max-w-none prose-p:text-white/75 prose-p:leading-relaxed prose-headings:text-white prose-headings:font-bold prose-a:text-stride-yellow-accent prose-strong:text-white prose-li:text-white prose-ul:my-2 prose-ol:my-2 [&_ul>li::marker]:text-stride-yellow-accent [&_ol>li::marker]:text-stride-yellow-accent'>
                  <ReactMarkdown>{race.description}</ReactMarkdown>
                </div>
              </div>
            </Reveal>
          )}

          <div className='mt-6 flex justify-center sm:justify-end'>
            <ShareButton
              url={shareUrl}
              text={[
                'Hey!',
                `${race.name} is on ${formatDateLongIST(race.race_date)} in ${race.city} 🏁`,
                race.coupon_code ? `Stride coupon code: ${race.coupon_code}` : null,
                'Details here -',
              ].filter(Boolean).join('\n')}
            />
          </div>
        </div>
      </div>

      {/* Sticky mobile CTA bar */}
      <div className='fixed bottom-0 left-0 right-0 sm:hidden bg-stride-purple-primary/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 z-40 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'>
        <div className='max-w-lg mx-auto'>
          <RaceDetailCtas registrationUrl={race.registration_url} couponCode={race.coupon_code} open={open} layout='row' />
        </div>
      </div>
    </main>
  )
}
