import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import { getEventBySlug, getConfirmedCount, getPackageSpotsTaken, getPublishedEvents } from '@/lib/data/events'
import {
  RegistrationCtaDesktop,
  RegistrationCtaMobile,
  RegistrationCtaDesktopSkeleton,
  RegistrationCtaMobileSkeleton,
} from '@/components/events/registration-cta'
import { EventHero } from '@/components/events/event-hero'
import { Reveal } from '@/components/ui/reveal'
import { ShareButton } from '@/components/events/share-button'
import { ArrowLeft, MapPin, Route, Users, ExternalLink, Gauge, Activity } from 'lucide-react'
import type { AdditionalField, EventPackage } from '@/types/event'
import {
  formatDateLongIST, formatTimeIST, formatMonthIST, formatDayIST,
} from '@/lib/utils/ist'
import { eventPriceLabel, FREE_LABEL } from '@/lib/utils/money'
import { InviteOnlyBadge } from '@/components/events/invite-only-badge'
import { MapEmbed } from '@/components/events/map-embed'
import { BfcacheRefresh } from '@/components/events/bfcache-refresh'
import { TrackBackdrop } from '@/components/ui/track-backdrop'
import { BackToTop } from '@/components/ui/back-to-top'

type Props = {
  params: Promise<{ slug: string }>
}

// ISR, matching the events index. Nothing on this page differs between
// viewers any more — the Register panel became a client island — so it is
// rendered once and reused, rather than rebuilt for every visitor, crawler and
// link preview. Admin event actions purge it on demand via revalidateTag, so
// the 60s window only ever applies between writes.
//
// One consequence: `isPast` and the spots-left figures are evaluated at render
// time, so they can lag by up to a revalidation window. Neither is
// authoritative — `register_for_event` enforces capacity and closure in the
// database, and the CTA is only ever an invitation to try.
export const revalidate = 60

/**
 * Prerender every published event at build time.
 *
 * `revalidate` alone is not enough on a dynamic segment: without any params to
 * prerender, Next has no route entry to cache against and every request is
 * rendered on demand and thrown away — verified against a production build,
 * where the route answered `Cache-Control: private, no-store` on every hit.
 * Declaring the params is what registers the ISR family, exactly as
 * /blog/[slug] and /originals/[slug] already do.
 *
 * `dynamicParams` stays at its default of true, so an event published after
 * the last deploy still resolves — rendered once on first request, then cached
 * like the rest.
 */
export async function generateStaticParams() {
  const events = await getPublishedEvents()
  return events.map((event) => ({ slug: event.slug }))
}

// At this many remaining spots (or fewer) the spots-left note turns into a
// red pulsating "Hurry!" message.
const SPOTS_URGENCY_THRESHOLD = 10

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  // Deduped with the page body via React cache() inside getEventBySlug
  const event = await getEventBySlug(slug)
  if (!event) return {}

  // First carousel image is the OG image; fall back to cover_url if banners missing
  let ogImage: string | null = null
  if (event.banner_images) {
    try { ogImage = (JSON.parse(event.banner_images) as string[])[0] ?? null } catch {}
  }
  if (!ogImage) ogImage = event.cover_url ?? null

  const title = `${event.name} — Stride Run Club`
  const description = event.subtitle ?? `Join us for ${event.name} with the Stride Run Club community in Bengaluru.`
  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.strideclub.in'}/events/${slug}`

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      siteName: 'Stride Run Club',
      title,
      description,
      images: ogImage ? [{ url: ogImage, alt: event.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

// Event times are always IST — see @/lib/utils/event-date.
function fmtDateLong(d: string | null) {
  return d ? formatDateLongIST(d) : null
}
function fmtTime(d: string | null) {
  return d ? formatTimeIST(d) : null
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  // Event row + confirmed-count come from the tag-cached reads (no DB hit on
  // most requests). Everything viewer-dependent (auth, registration state)
  // lives in the Suspense-streamed RegistrationCta islands below, so the
  // whole page shell flushes without waiting on auth.
  const event = await getEventBySlug(slug)

  if (!event || event.status === 'DRAFT') notFound()

  const confirmedCount = await getConfirmedCount(event.id)

  // Invite-only: applying is free and unlimited, and Stride picks who runs.
  // Capacity gates approvals, not applications — so the page must not close
  // itself, quote a price, or advertise a spot count.
  const inviteOnly = event.invite_only === true

  // An admin can close sign-ups without capacity being reached — a paused run
  // reads exactly like a sold-out one, including for invite-only applications,
  // which is the only way to stop the inflow while the decisions are made.
  const registrationsClosed = event.registrations_closed === true

  const isFull = registrationsClosed
    || (!inviteOnly && !!event.capacity && (confirmedCount ?? 0) >= event.capacity)
  // Past events (start date has elapsed). Falls back to false for events without a date.
  const isPast = !!event.event_date && new Date(event.event_date).getTime() < Date.now()

  // Spots-left indicator — admin-toggled per event; needs a capacity to mean
  // anything. At SPOTS_URGENCY_THRESHOLD or fewer it switches to a red
  // pulsating "Hurry!" note. Suppressed under invite-only: "3 spots left" on a
  // free application misrepresents a curated process and invites gaming.
  const spotsLeft = event.capacity ? Math.max(0, event.capacity - (confirmedCount ?? 0)) : null
  const showSpotsLeft = !inviteOnly && !!event.show_spots_left && spotsLeft !== null && spotsLeft > 0 && !isPast && !isFull
  const spotsUrgent = showSpotsLeft && spotsLeft <= SPOTS_URGENCY_THRESHOLD
  const spotsLabel = spotsUrgent
    ? `Hurry! Only ${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`
    : `${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`
  const spotsLine = showSpotsLeft ? (
    <p className={`text-sm font-bold mt-1 ${spotsUrgent ? 'text-red-400 animate-pulse' : 'text-stride-yellow-accent'}`}>
      {spotsLabel}
    </p>
  ) : null

  let bannerImages: string[] = []
  try { bannerImages = JSON.parse(event.banner_images ?? '[]') as string[] }
  catch { /* empty */ }
  if (bannerImages.length === 0 && event.cover_url) bannerImages = [event.cover_url]

  // Custom additional fields the admin defined for this event
  let additionalFields: AdditionalField[] = []
  try { additionalFields = JSON.parse(event.additional_fields ?? '[]') as AdditionalField[] }
  catch { additionalFields = [] }

  // Priced tiers, when the admin chose those over a single fixed price.
  let packages: EventPackage[] = []
  try { packages = JSON.parse(event.packages ?? '[]') as EventPackage[] }
  catch { packages = [] }
  // Packages stay on the row so they come back when invite-only is switched
  // off, but an applicant must never see a priced tier.
  const packagesEnabled = !inviteOnly && (event.packages_enabled ?? false) && packages.length > 0

  // Same for every viewer, so it is resolved here rather than from the browser:
  // a cached read tagged with the event's registration tag, which every
  // registration purges. Skipped entirely when the event has no priced tiers.
  const packageSpotsTaken = packagesEnabled ? await getPackageSpotsTaken(event.id) : {}

  const hasBanners = bannerImages.length > 0
  const dateLong  = fmtDateLong(event.event_date)
  const startTime = fmtTime(event.event_date)
  const endTime   = fmtTime(event.end_date)
  // With packages the headline can only be a "From ₹X" — the runner picks the
  // total. Under invite-only there is nothing to charge, so it reads as free.
  const priceLabel = inviteOnly ? FREE_LABEL : eventPriceLabel(event.price_paise, packages, packagesEnabled)
  const shareUrl   = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.strideclub.in'}/events/${slug}`

  // `overflow-clip`, NOT `overflow-hidden`: hidden makes this a scroll container,
  // which kills the view() timeline of every <Reveal> below it — the reveals
  // still render (their base style is opacity:1) but stop animating. clip clips
  // the same way without establishing a scrollport. See globals.css.
  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-clip pb-32 sm:pb-20'>

      {/* Refresh on back/forward bfcache restore — so post-registration the page
          can't show a stale "Register" CTA after the user hits browser back. */}
      <BfcacheRefresh />

      {/* Run-club backdrop — track lanes, route line, grain */}
      <TrackBackdrop />

      {/* Floating back-to-top — surfaces the "All Events" link on long pages */}
      <BackToTop />

      {/* Two-column layout */}
      <div className='relative z-10 lg:flex lg:pt-28 lg:max-w-6xl lg:mx-auto lg:gap-10 lg:px-6'>

        {/* ── LEFT: Image + Going section ── */}
        <div className='w-full lg:w-[42%] shrink-0 pt-24 lg:pt-0'>

          {/* Back link — mobile only */}
          <div className='lg:hidden px-5 pb-3'>
            <Link href='/events' className='inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors group'>
              <ArrowLeft size={14} className='group-hover:-translate-x-0.5 transition-transform' />
              All Events
            </Link>
          </div>

          {/* Carousel — clean, no bounding box */}
          {hasBanners ? (
            <EventHero images={bannerImages} eventName={event.name} />
          ) : (
            <div className='relative w-full aspect-square rounded-md flex items-center justify-center'>
              <span className='text-white/10 text-7xl select-none'>🏃</span>
            </div>
          )}

        </div>

        {/* ── RIGHT: Event content ── */}
        <div className='flex-1 min-w-0 px-5 sm:px-8 lg:px-0 pt-6 lg:pt-0 lg:pb-20'>

          {/* Back link — desktop only */}
          <div className='hidden lg:block mb-6'>
            <Link href='/events' className='inline-flex items-center gap-1.5 text-white/35 hover:text-white/80 text-sm transition-colors group'>
              <ArrowLeft size={14} className='group-hover:-translate-x-0.5 transition-transform' />
              All Events
            </Link>
          </div>

          {/* Title */}
          <Reveal>
            {/* Above the name, not among the distance pills: it changes what
                registering MEANS, so it has to be read before the title. */}
            {inviteOnly && (
              <div className='mb-3'>
                <InviteOnlyBadge size='md' />
              </div>
            )}
            <h1 className='text-4xl sm:text-5xl font-bold text-white leading-[1.05] tracking-tight'>
              {event.name}
            </h1>
            {event.subtitle && (
              <p className='text-white/50 text-lg mt-3 leading-relaxed'>{event.subtitle}</p>
            )}

            {/* Distance + Difficulty pills */}
            {(event.distance_km || event.difficulty) && (
              <div className='flex flex-wrap gap-2 mt-4'>
                {event.distance_km && (
                  <span className='inline-flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-full px-3 py-1 text-white/80 text-xs font-semibold'>
                    <Gauge size={12} className='text-stride-yellow-accent' />
                    {event.distance_km} km
                  </span>
                )}
                {event.difficulty && (
                  <span className='inline-flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-full px-3 py-1 text-white/80 text-xs font-semibold'>
                    <Activity size={12} className='text-stride-yellow-accent' />
                    {event.difficulty}
                  </span>
                )}
              </div>
            )}
          </Reveal>

          {/* ── When & Where (clubbed) ── */}
          {(dateLong || event.location) && (
            <Reveal>
              <div className='mt-7 rounded-2xl border border-white/10 bg-white/4 overflow-hidden'>
                {dateLong && event.event_date && (
                  <div className='flex items-start gap-4 px-5 py-4 border-b border-white/8'>
                    {/* Mini calendar chip */}
                    <div className='w-11 h-11 rounded-xl bg-white/8 border border-white/12 flex flex-col items-center justify-center shrink-0 leading-none gap-0.5 mt-0.5'>
                      <span className='text-stride-yellow-accent text-[8px] font-black font-mono uppercase tracking-widest'>
                        {formatMonthIST(event.event_date)}
                      </span>
                      <span className='text-white font-bold text-base leading-none font-mono'>
                        {formatDayIST(event.event_date)}
                      </span>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest mb-0.5'>When</p>
                      <p className='text-white font-semibold text-base font-mono'>{dateLong}</p>
                      {(startTime || endTime) && (
                        <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-sm'>
                          {startTime && (
                            <span className='text-white/70 font-mono'>
                              <span className='text-white/35 text-[10px] font-mono uppercase tracking-widest mr-1'>Starts</span>
                              {startTime}
                            </span>
                          )}
                          {startTime && endTime && <span className='text-white/20'>·</span>}
                          {endTime && (
                            <span className='text-white/70 font-mono'>
                              <span className='text-white/35 text-[10px] font-mono uppercase tracking-widest mr-1'>Ends</span>
                              {endTime}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {event.location && (
                  <div className='flex items-start gap-4 px-5 py-4'>
                    <div className='w-11 h-11 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center shrink-0 mt-0.5'>
                      <MapPin size={15} className='text-white/50' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest mb-0.5'>Where</p>
                      {event.location_url ? (
                        <a
                          href={event.location_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-1.5 text-white font-semibold text-base hover:text-stride-yellow-accent transition-colors'
                        >
                          {event.location}
                          <ExternalLink size={13} className='opacity-50 shrink-0' />
                        </a>
                      ) : (
                        <p className='text-white font-semibold text-base'>{event.location}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          )}

          {/* ── Post run meetup spot + Route (clubbed) ── */}
          {(event.post_run_location_url || event.post_run_location || event.strava_route_url) && (
            <Reveal>
              <div className='mt-3 rounded-2xl border border-white/10 bg-white/4 overflow-hidden'>
                {(event.post_run_location_url || event.post_run_location) && (
                  // Without a Maps URL the anchor has no href — it renders as
                  // a plain, non-clickable row showing just the place name.
                  <a
                    {...(event.post_run_location_url
                      ? { href: event.post_run_location_url, target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className='flex items-center gap-4 px-5 py-4 hover:bg-white/4 transition-colors group/row'
                    style={event.strava_route_url ? { borderBottom: '1px solid rgba(255,255,255,0.08)' } : undefined}
                  >
                    <div className='w-11 h-11 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center shrink-0'>
                      <Users size={15} className='text-white/50 group-hover/row:text-stride-yellow-accent transition-colors' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest mb-0.5'>Post Run Meetup Spot</p>
                      <p className='text-white font-semibold text-sm group-hover/row:text-stride-yellow-accent transition-colors line-clamp-2'>
                        {event.post_run_location || 'Where we gather after the run'}
                      </p>
                    </div>
                    {event.post_run_location_url && (
                      <ExternalLink size={14} className='text-white/30 shrink-0 group-hover/row:text-stride-yellow-accent transition-colors' />
                    )}
                  </a>
                )}

                {event.strava_route_url && (
                  <a
                    href={event.strava_route_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-4 px-5 py-4 hover:bg-white/4 transition-colors group/row'
                  >
                    <div className='w-11 h-11 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center shrink-0'>
                      <Route size={15} className='text-white/50 group-hover/row:text-stride-yellow-accent transition-colors' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest mb-0.5'>Route</p>
                      <p className='text-white font-semibold text-sm group-hover/row:text-stride-yellow-accent transition-colors'>
                        View the run route on Strava
                      </p>
                    </div>
                    <ExternalLink size={14} className='text-white/30 shrink-0 group-hover/row:text-stride-yellow-accent transition-colors' />
                  </a>
                )}
              </div>
            </Reveal>
          )}

          {/* About the experience */}
          {event.details && (
            <Reveal>
              <div className='mt-8'>
                <p className='text-white/40 text-xs font-bold font-mono uppercase tracking-widest mb-4'>About the experience</p>
                <div className='prose prose-invert prose-sm max-w-none prose-p:text-white/75 prose-p:leading-relaxed prose-headings:text-white prose-headings:font-bold prose-a:text-stride-yellow-accent prose-strong:text-white prose-li:text-white prose-ul:my-2 prose-ol:my-2 [&_ul>li::marker]:text-stride-yellow-accent [&_ol>li::marker]:text-stride-yellow-accent'>
                  <ReactMarkdown>{event.details}</ReactMarkdown>
                </div>
              </div>
            </Reveal>
          )}

          {/* Meeting-point map */}
          {event.location && (
            <Reveal>
              <div className='mt-8'>
                <p className='text-white/40 text-xs font-bold font-mono uppercase tracking-widest mb-4'>Meet here</p>
                <MapEmbed locationName={event.location} locationUrl={event.location_url} />
              </div>
            </Reveal>
          )}

          {/* ── Registration box — bottom of page (desktop). Mobile uses the sticky bar below. ── */}
          <Reveal>
            <div className='hidden sm:block mt-10 rounded-2xl border border-white/15 bg-white/3 overflow-hidden'>
              <div className='px-5 py-3 border-b border-white/8'>
                <p className='text-white/50 text-xs font-bold font-mono uppercase tracking-widest'>Registration</p>
              </div>
              <div className='px-5 py-5'>
                <Suspense
                  fallback={
                    <RegistrationCtaDesktopSkeleton
                      isPast={isPast}
                      isFull={isFull}
                      priceLabel={priceLabel}
                      spotsLine={spotsLine}
                      inviteOnly={inviteOnly}
                    />
                  }
                >
                  <RegistrationCtaDesktop
                    eventId={event.id}
                    eventSlug={slug}
                    pricePaise={event.price_paise}
                    isFull={isFull}
                    isPast={isPast}
                    additionalFields={additionalFields}
                    termsAndConditions={event.terms_and_conditions}
                    packages={packages}
                    packagesEnabled={packagesEnabled}
                    packagesMultiSelect={event.packages_multi_select ?? false}
                    packageSpotsTaken={packageSpotsTaken}
                    packagesProgressive={event.packages_progressive === true}
                    inviteOnly={inviteOnly}
                    razorpayKeyId={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}
                    priceLabel={priceLabel}
                    spotsLine={spotsLine}
                  />
                </Suspense>
              </div>
            </div>
          </Reveal>

          {/* Share — very bottom of the page, both mobile and desktop */}
          <div className='mt-6 flex justify-center sm:justify-end'>
            <ShareButton
              url={shareUrl}
              text={[
                'Hey!',
                'I am attending this experience with Stride Run Club 🏃',
                event.name,
                dateLong || startTime ? `When: ${[dateLong, startTime].filter(Boolean).join(', ')}` : null,
                event.location ? `Where: ${event.location}` : null,
                'Sign up now on this link -',
              ].filter(Boolean).join('\n')}
            />
          </div>

        </div>
      </div>

      {/* Sticky mobile registration bar */}
      <div className='fixed bottom-0 left-0 right-0 sm:hidden bg-stride-purple-primary/95 backdrop-blur-xl border-t border-white/10 px-4 py-4 z-40'>
        {showSpotsLeft && (
          <p className={`text-center text-xs font-bold mb-2.5 ${spotsUrgent ? 'text-red-400 animate-pulse' : 'text-stride-yellow-accent'}`}>
            {spotsLabel}
          </p>
        )}
        <div className='flex items-center gap-4 max-w-lg mx-auto'>
          <div>
            <p className='text-white/40 text-xs'>{inviteOnly ? 'To apply' : 'Entry fee'}</p>
            <p className='text-white font-bold text-xl leading-none mt-0.5 font-mono'>{priceLabel}</p>
          </div>
          <div className='flex-1'>
            <Suspense fallback={<RegistrationCtaMobileSkeleton />}>
              <RegistrationCtaMobile
                eventId={event.id}
                eventSlug={slug}
                pricePaise={event.price_paise}
                isFull={isFull}
                isPast={isPast}
                additionalFields={additionalFields}
                termsAndConditions={event.terms_and_conditions}
                packages={packages}
                packagesEnabled={packagesEnabled}
                packagesMultiSelect={event.packages_multi_select ?? false}
                packageSpotsTaken={packageSpotsTaken}
                    packagesProgressive={event.packages_progressive === true}
                inviteOnly={inviteOnly}
                razorpayKeyId={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}
              />
            </Suspense>
          </div>
        </div>
      </div>

    </main>
  )
}
