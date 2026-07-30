import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import { CheckCircle2, MapPin, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { buildGoogleCalendarUrl, calendarDescription } from '@/lib/google-calendar'
import { PRODUCTION_SITE_URL } from '@/lib/site-url'
import { RunnerTagTicket } from '@/components/events/runner-tag-ticket'
import { WalletPassSection, WalletPassSectionSkeleton } from '@/components/events/wallet-pass-section'
import { ShareConfirmation } from '@/components/events/share-confirmation'
import { Reveal } from '@/components/ui/reveal'
import { PostCard } from '@/components/blog/post-card'
import { BLOG_POSTS } from '@/content/blog/index'
import { formatDateShortIST, formatTimeIST } from '@/lib/utils/ist'
import { priceLabel as priceOf } from '@/lib/utils/money'
import { sumPackageAmountPaise, type SelectedPackage } from '@/types/event'

// Re-fetch on every visit. Confirmation state is per-user, not cacheable, and
// we want to always reflect the live registration row.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string; regId: string }>
  searchParams: Promise<{ wallet?: string }>
}

export const metadata: Metadata = {
  title: 'Booking Confirmed — Stride Run Club',
  description: 'Your event registration is confirmed.',
}

// Event times are always IST — see @/lib/utils/event-date.
function formatDateShort(d: string | null) {
  return d ? formatDateShortIST(d) : null
}
function formatTime(d: string | null) {
  return d ? formatTimeIST(d) : null
}


export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { regId } = await params
  const { wallet } = await searchParams

  // One DB round trip instead of the old two-stage waterfall.
  //
  // getClaims() verifies the session JWT locally against the project's public
  // keys (asymmetric signing) — no network hop to Supabase, unlike getUser().
  // Same mechanism src/middleware.ts already relies on. We take only identity
  // (`sub`/`email`) from the token; ownership is still checked against the live
  // registration row below, and no role decision is made on this page, so the
  // "always read role fresh from the DB" rule is untouched.
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims ?? null
  if (!claims) redirect('/become-a-member')

  const userId = claims.sub

  // Having the user id without a network round trip lets the registration and
  // profile reads run as a single parallel stage. The event is embedded via the
  // event_registrations.event_id → events.id foreign key, collapsing what used
  // to be a second stage.
  const [{ data: registration }, { data: profile }] = await Promise.all([
    adminClient
      .from('event_registrations')
      .select(
        'id, user_id, status, amount_paid_paise, razorpay_payment_id, selected_packages, events!inner(name, slug, subtitle, event_date, end_date, location, banner_images, price_paise, distance_km, confirmation_text)'
      )
      .eq('id', regId)
      .single(),
    adminClient
      .from('users')
      .select('full_name, runner_tag')
      .eq('id', userId)
      .single(),
  ])

  if (!registration || registration.user_id !== userId || registration.status !== 'CONFIRMED') {
    notFound()
  }

  // PostgREST returns a to-one embed as an object, but normalise defensively so
  // a relationship-shape surprise can't crash the page.
  const event = Array.isArray(registration.events) ? registration.events[0] : registration.events
  if (!event) notFound()

  const dateShort = formatDateShort(event.event_date)
  const startTime = formatTime(event.event_date)
  const compactDate = startTime && dateShort ? `${dateShort} · ${startTime}` : dateShort

  let eventBannerUrl: string | null = null
  try {
    const banners = JSON.parse(event.banner_images ?? '[]') as string[]
    eventBannerUrl = banners[0] ?? null
  } catch { /* keep null */ }

  // What this runner actually bought, snapshotted at registration — so an admin
  // editing package prices later can't rewrite their receipt.
  let selectedPackages: SelectedPackage[] = []
  try { selectedPackages = JSON.parse(registration.selected_packages ?? '[]') as SelectedPackage[] }
  catch { selectedPackages = [] }

  // The poster shows what the runner paid when there were packages, since the
  // event's own price_paise is meaningless in that case.
  const priceLabel = selectedPackages.length > 0
    ? priceOf(registration.amount_paid_paise ?? sumPackageAmountPaise(selectedPackages))
    : priceOf(event.price_paise)

  // Add-to-calendar — only for runs that haven't concluded yet. The links inside
  // the calendar entry use the canonical origin, never NEXT_PUBLIC_SITE_URL: the
  // entry sits in the runner's calendar long after this deployment is gone, and
  // adding a run from a local build wrote http://localhost:3000 links into it.
  const concludesAt = event.end_date ?? event.event_date
  const isConcluded = !!concludesAt && new Date(concludesAt).getTime() < Date.now()

  const googleCalendarUrl = event.event_date && !isConcluded
    ? buildGoogleCalendarUrl({
        eventName: event.name,
        startIso: event.event_date,
        endIso: event.end_date ?? null,
        location: event.location ?? null,
        description: calendarDescription({
          siteUrl: PRODUCTION_SITE_URL,
          eventSlug: event.slug,
          registrationId: registration.id,
          runnerTag: profile?.runner_tag ?? null,
          location: event.location ?? null,
        }),
      })
    : null

  // Three most-recent blog posts for the "Keep reading" section
  const blogPicks = [...BLOG_POSTS]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3)

  // The ambient glow is a background gradient, not blurred orb elements — see
  // `.ambient-glow` in globals.css. That also lets `overflow-hidden` go from
  // <main>: it was only there to clip the orbs, and as a scroll container it
  // would have killed the view() timeline of every <Reveal> below, silently
  // disabling the scroll reveal on this page.
  return (
    <main className='relative min-h-screen bg-stride-purple-primary ambient-glow pb-20'>

      <div className='relative z-10 pt-28 sm:pt-32'>

        {/* Top sections — narrower for comfortable reading width */}
        <div className='max-w-2xl mx-auto px-5 sm:px-8 space-y-7'>

        {/* ── Success badge ── */}
        <Reveal>
          <div className='flex flex-col items-center text-center'>
            <div className='relative inline-flex items-center justify-center mb-5'>
              <div className='absolute w-20 h-20 rounded-full bg-green-500/12 animate-ping' style={{ animationDuration: '2.6s' }} aria-hidden='true' />
              <div className='relative w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center'>
                <CheckCircle2 className='text-green-400' size={28} strokeWidth={2.5} />
              </div>
            </div>
            <h1 className='text-3xl sm:text-4xl font-bold text-white leading-tight'>Booking confirmed</h1>
            <p className='text-white/45 text-sm mt-2'>
              Confirmation code <span className='font-mono text-white/70 ml-1'>STRIDE-{registration.id.slice(0, 8).toUpperCase()}</span>
            </p>
          </div>
        </Reveal>

        {/* ── A note from Stride — field only, no label, sits right under the header ── */}
        {event.confirmation_text && event.confirmation_text.trim() && (
          <Reveal>
            <div className='rounded-2xl border border-stride-yellow-accent/25 bg-stride-yellow-accent/5 px-5 py-4'>
              <div className='prose prose-invert prose-sm max-w-none prose-p:text-white/85 prose-p:leading-relaxed prose-p:my-1.5 prose-headings:text-white prose-headings:font-bold prose-a:text-stride-yellow-accent prose-strong:text-white prose-li:text-white/85 prose-ul:my-2 prose-ol:my-2 [&_ul>li::marker]:text-stride-yellow-accent [&_ol>li::marker]:text-stride-yellow-accent'>
                <ReactMarkdown>{event.confirmation_text}</ReactMarkdown>
              </div>
            </div>
          </Reveal>
        )}

        {/* ── Event card — clickable, mirrors the public event card ── */}
        <Reveal>
          <Link
            href={`/events/${event.slug}`}
            className='group block rounded-md border border-white/10 bg-white/4 overflow-hidden hover:border-white/25 hover:bg-white/6 transition-all duration-300'
          >
            {/* Image — 3:4 poster, edge-to-edge */}
            <div className='relative aspect-3/4 bg-white/5'>
              {eventBannerUrl ? (
                <Image
                  src={eventBannerUrl}
                  alt={event.name}
                  fill
                  className='object-cover group-hover:scale-[1.02] transition-transform duration-500'
                  sizes='(max-width: 640px) 100vw, 640px'
                  // This poster is the LCP element. Without `priority` it stays
                  // lazy and only starts downloading after layout, which on
                  // mobile pushed LCP out by seconds.
                  priority
                />
              ) : (
                <div className='absolute inset-0 flex items-center justify-center text-white/10 text-6xl select-none'>
                  🏃
                </div>
              )}
            </div>

            {/* Body */}
            <div className='px-4 py-4'>
              {compactDate && (
                <p className='text-stride-yellow-accent text-sm font-medium mb-1.5 font-mono'>
                  {compactDate}
                </p>
              )}
              <h2 className='text-white font-bold text-xl leading-snug group-hover:text-stride-yellow-accent transition-colors'>
                {event.name}
              </h2>
              {event.subtitle && (
                <p className='text-white/45 text-sm mt-1 line-clamp-1'>{event.subtitle}</p>
              )}

              <div className='flex items-center justify-between mt-2.5 gap-2'>
                {event.location ? (
                  <span className='flex items-center gap-1.5 text-white/55 text-sm min-w-0'>
                    <MapPin size={12} className='shrink-0 text-white/30' />
                    <span className='truncate'>{event.location}</span>
                  </span>
                ) : <span />}
                <span className={`text-sm font-bold shrink-0 ${event.price_paise === 0 ? 'text-green-400' : 'text-white/70'}`}>
                  {priceLabel}
                </span>
              </div>

              <div className='flex items-center gap-1 mt-3 text-white/30 text-xs font-medium group-hover:text-stride-yellow-accent transition-colors'>
                View event details
                <ArrowRight size={12} className='group-hover:translate-x-0.5 transition-transform' />
              </div>
            </div>
          </Link>
        </Reveal>

        {/* ── Receipt — what they picked and what they paid. Every value is read
            straight from the DB (the amount server-verified against Razorpay),
            never from the client. Rendered whenever there's either a payment or a
            package to show: a ₹0 package confirms without a payment, so keying
            this off amount_paid_paise alone would hide the package they chose. ── */}
        {(registration.amount_paid_paise != null || selectedPackages.length > 0) && (
          <Reveal>
            {/* backdrop-blur is softened on mobile: backdrop-filter forces the
                browser to re-render and re-filter everything behind the element,
                which is one of the costliest things you can do on a low-end
                phone. Desktop keeps the full glass effect. */}
            <div className='rounded-xl bg-white/10 backdrop-blur-sm md:backdrop-blur-md border border-white/15 px-5 py-4'>
              <p className='text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest mb-3'>
                {selectedPackages.length > 0 ? 'Your package' : 'Payment'}
              </p>

              {selectedPackages.map(pkg => (
                <div key={pkg.id} className='flex items-baseline justify-between gap-4 mb-2.5'>
                  <span className='text-white/75 text-sm min-w-0'>{pkg.name}</span>
                  <span className='text-white/75 text-sm shrink-0'>{priceOf(pkg.amountPaise)}</span>
                </div>
              ))}

              <div className={`flex items-center justify-between gap-4 ${selectedPackages.length > 0 ? 'pt-2.5 border-t border-white/8' : ''}`}>
                <span className='text-white/60 text-sm'>
                  {registration.amount_paid_paise != null ? 'Amount paid' : 'Total'}
                </span>
                <span className='text-white font-bold text-sm'>
                  {priceOf(registration.amount_paid_paise ?? sumPackageAmountPaise(selectedPackages))}
                </span>
              </div>

              {registration.razorpay_payment_id && (
                <div className='flex items-center justify-between gap-4 mt-2.5 pt-2.5 border-t border-white/8'>
                  <span className='text-white/60 text-sm shrink-0'>Payment ID</span>
                  <span className='font-mono text-white/70 text-xs truncate'>{registration.razorpay_payment_id}</span>
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* ── Here's your next steps — wallet, calendar, share ── */}
        <Reveal>
          <h2 className='text-white font-bold text-xl leading-tight pt-2'>Here&apos;s your next steps</h2>
        </Reveal>

        {/* Save to your wallet — streamed separately so the external wallet
            quota check never blocks the rest of the page. Hidden when the run
            is over, the monthly quota is exhausted, or this booking hit its cap.
            The pass QR deep-links to the admin check-in page. */}
        {!isConcluded && (
          <Suspense fallback={<WalletPassSectionSkeleton />}>
            <WalletPassSection
              registrationId={registration.id}
              isConcluded={isConcluded}
              walletFlag={wallet}
            />
          </Suspense>
        )}

        {/* Block your calendar — upcoming runs only */}
        {googleCalendarUrl && (
          <Reveal>
            <div>
              <p className='text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest mb-3'>Block your calendar</p>
              <a
                href={googleCalendarUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center justify-center gap-2.5 w-full min-h-11 rounded-md bg-white/10 backdrop-blur-md border border-white/15 hover:border-stride-yellow-accent/50 transition-colors text-white font-semibold text-sm px-5 py-3'
              >
                <Image
                  src='https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/google-calendar-icon.webp'
                  alt=''
                  width={18}
                  height={18}
                  className='shrink-0'
                />
                Add to Google Calendar
              </a>
            </div>
          </Reveal>
        )}

        {/* Spread the word */}
        <Reveal>
          <div>
            <p className='text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest mb-3'>Spread the word</p>
            <ShareConfirmation
              eventName={event.name}
              eventDate={compactDate ?? null}
              eventDateLabel={dateShort ?? null}
              eventTimeLabel={startTime ?? null}
              eventLocation={event.location ?? null}
              eventDistanceKm={event.distance_km ?? null}
              eventSlug={event.slug}
              eventBannerUrl={eventBannerUrl}
            />
          </div>
        </Reveal>

        {/* ── Stride tag ── */}
        <Reveal>
          <RunnerTagTicket
            runnerTag={profile?.runner_tag ?? null}
            registrationId={registration.id}
            userName={profile?.full_name ?? claims.email ?? ''}
          />
        </Reveal>

        </div>
        {/* End narrow column */}

        {/* ── Keep reading — wider column so the 3-up grid breathes on desktop ── */}
        {blogPicks.length > 0 && (
          <div className='max-w-5xl mx-auto px-5 sm:px-8 mt-12 sm:mt-16'>
            <Reveal>
              <div className='pt-8 border-t border-white/8'>
                <div className='flex items-end justify-between gap-4 mb-5'>
                  <div>
                    <p className='text-stride-yellow-accent text-[10px] font-bold font-mono uppercase tracking-widest mb-1.5'>Stride Run Club Blogs</p>
                    <h3 className='text-white font-bold text-xl leading-tight'>Stories and run recaps to read while you lace up.</h3>
                  </div>
                  <Link
                    href='/blog'
                    className='inline-flex items-center gap-1 text-white/40 hover:text-stride-yellow-accent text-sm font-medium transition-colors shrink-0'
                  >
                    All stories
                    <ArrowRight size={13} />
                  </Link>
                </div>
                {/* `reveal-stagger` cascades these cards, which all enter the
                    viewport together. A scroll-timeline animation ignores
                    animation-delay, so the stagger lives in animation-range
                    offsets — see globals.css. */}
                <div className='reveal-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'>
                  {blogPicks.map((post) => (
                    <Reveal key={post.slug}>
                      <PostCard post={post} />
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        )}

      </div>
    </main>
  )
}
