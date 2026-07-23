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
import { RunnerTagTicket } from '@/components/events/runner-tag-ticket'
import { WalletPassSection, WalletPassSectionSkeleton } from '@/components/events/wallet-pass-section'
import { ShareConfirmation } from '@/components/events/share-confirmation'
import { SectionReveal } from '@/components/ui/section-reveal'
import { PostCard } from '@/components/blog/post-card'
import { BLOG_POSTS } from '@/content/blog/index'

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

function formatDateShort(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}
function formatTime(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}


export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { regId } = await params
  const { wallet } = await searchParams

  // Two parallel stages instead of the old five-hop waterfall: auth check and
  // registration lookup are independent (ownership is verified after both
  // resolve), then everything keyed off them fires together.
  const supabase = await createClient()
  const [{ data: { user } }, { data: registration }] = await Promise.all([
    supabase.auth.getUser(),
    adminClient
      .from('event_registrations')
      .select('id, user_id, status, event_id')
      .eq('id', regId)
      .single(),
  ])

  if (!user) redirect('/become-a-member')
  if (!registration || registration.user_id !== user.id || registration.status !== 'CONFIRMED') {
    notFound()
  }

  const [{ data: event }, { data: profile }] = await Promise.all([
    adminClient
      .from('events')
      .select('id, name, slug, subtitle, event_date, end_date, location, location_url, banner_images, price_paise, confirmation_text')
      .eq('id', registration.event_id)
      .single(),
    adminClient
      .from('users')
      .select('full_name, runner_tag')
      .eq('id', user.id)
      .single(),
  ])

  if (!event) notFound()

  const dateShort = formatDateShort(event.event_date)
  const startTime = formatTime(event.event_date)
  const compactDate = startTime && dateShort ? `${dateShort} · ${startTime}` : dateShort

  let eventBannerUrl: string | null = null
  try {
    const banners = JSON.parse(event.banner_images ?? '[]') as string[]
    eventBannerUrl = banners[0] ?? null
  } catch { /* keep null */ }

  const priceLabel = event.price_paise === 0 ? 'Free' : `₹${(event.price_paise / 100).toLocaleString('en-IN')}`

  // Add-to-calendar — only for runs that haven't concluded yet
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.strideclub.in'
  const concludesAt = event.end_date ?? event.event_date
  const isConcluded = !!concludesAt && new Date(concludesAt).getTime() < Date.now()

  const googleCalendarUrl = event.event_date && !isConcluded
    ? buildGoogleCalendarUrl({
        eventName: event.name,
        startIso: event.event_date,
        endIso: event.end_date ?? null,
        location: event.location ?? null,
        description: calendarDescription({
          siteUrl,
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

  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-hidden pb-20'>

      {/* Ambient orbs */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute top-[-10%] left-[-8%] w-160 h-160 rounded-full bg-stride-yellow-accent/7 blur-[130px]' />
        <div className='absolute top-[40%] right-[-10%] w-xl h-144 rounded-full bg-green-400/4 blur-[120px]' />
      </div>

      <div className='relative z-10 pt-28 sm:pt-32'>

        {/* Top sections — narrower for comfortable reading width */}
        <div className='max-w-2xl mx-auto px-5 sm:px-8 space-y-7'>

        {/* ── Success badge ── */}
        <SectionReveal>
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
        </SectionReveal>

        {/* ── A note from Stride — field only, no label, sits right under the header ── */}
        {event.confirmation_text && event.confirmation_text.trim() && (
          <SectionReveal delay={0.04}>
            <div className='rounded-2xl border border-stride-yellow-accent/25 bg-stride-yellow-accent/5 px-5 py-4'>
              <div className='prose prose-invert prose-sm max-w-none prose-p:text-white/85 prose-p:leading-relaxed prose-p:my-1.5 prose-headings:text-white prose-headings:font-bold prose-a:text-stride-yellow-accent prose-strong:text-white prose-li:text-white/85 prose-ul:my-2 prose-ol:my-2 [&_ul>li::marker]:text-stride-yellow-accent [&_ol>li::marker]:text-stride-yellow-accent'>
                <ReactMarkdown>{event.confirmation_text}</ReactMarkdown>
              </div>
            </div>
          </SectionReveal>
        )}

        {/* ── Event card — clickable, mirrors the public event card ── */}
        <SectionReveal delay={0.06}>
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
        </SectionReveal>

        {/* ── Here's your next steps — wallet, calendar, share ── */}
        <SectionReveal delay={0.1}>
          <h2 className='text-white font-bold text-xl leading-tight pt-2'>Here&apos;s your next steps</h2>
        </SectionReveal>

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
          <SectionReveal delay={0.14}>
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
          </SectionReveal>
        )}

        {/* Spread the word */}
        <SectionReveal delay={0.16}>
          <div>
            <p className='text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest mb-3'>Spread the word</p>
            <ShareConfirmation
              eventName={event.name}
              eventDate={compactDate ?? null}
              eventLocation={event.location ?? null}
              eventSlug={event.slug}
              eventBannerUrl={eventBannerUrl}
            />
          </div>
        </SectionReveal>

        {/* ── Stride tag ── */}
        <SectionReveal delay={0.2}>
          <RunnerTagTicket
            runnerTag={profile?.runner_tag ?? null}
            registrationId={registration.id}
            userName={profile?.full_name ?? user.email ?? ''}
          />
        </SectionReveal>

        </div>
        {/* End narrow column */}

        {/* ── Keep reading — wider column so the 3-up grid breathes on desktop ── */}
        {blogPicks.length > 0 && (
          <div className='max-w-5xl mx-auto px-5 sm:px-8 mt-12 sm:mt-16'>
            <SectionReveal delay={0.32}>
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
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'>
                  {blogPicks.map((post, i) => (
                    <SectionReveal key={post.slug} delay={0.36 + i * 0.06}>
                      <PostCard post={post} />
                    </SectionReveal>
                  ))}
                </div>
              </div>
            </SectionReveal>
          </div>
        )}

      </div>
    </main>
  )
}
