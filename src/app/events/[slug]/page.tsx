import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { RegisterButton } from '@/components/events/register-button'
import { EventHero } from '@/components/events/event-hero'
import { SectionReveal } from '@/components/ui/section-reveal'
import { ShareButton } from '@/components/events/share-button'
import { ArrowLeft, MapPin, Route, Coffee, ExternalLink, Gauge, Activity } from 'lucide-react'
import type { AdditionalField } from '@/types/event'
import { MapEmbed } from '@/components/events/map-embed'
import { BfcacheRefresh } from '@/components/events/bfcache-refresh'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ register?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: event } = await adminClient
    .from('events')
    .select('name, subtitle, cover_url, banner_images')
    .eq('slug', slug)
    .single()
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

function fmtDateLong(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
function fmtMonth(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()
}
function fmtDay(d: string) {
  return new Date(d).getDate()
}

export default async function EventDetailPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { register } = await searchParams
  const autoOpenModal = register === '1'

  const { data: event } = await adminClient
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!event || event.status === 'DRAFT') notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  const { count: confirmedCount } = await adminClient
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('status', 'CONFIRMED')

  const isFull = !!event.capacity && (confirmedCount ?? 0) >= event.capacity
  // Past events (start date has elapsed). Falls back to false for events without a date.
  const isPast = !!event.event_date && new Date(event.event_date).getTime() < Date.now()

  let isRegistered = false
  let participantInitial = {
    fullName: null as string | null,
    dateOfBirth: null as string | null,
    gender: null as string | null,
    contactNumber: null as string | null,
    emergencyContactNumber: null as string | null,
  }
  if (user) {
    const [{ data: reg }, { data: profile }] = await Promise.all([
      adminClient
        .from('event_registrations')
        .select('status')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle(),
      adminClient
        .from('users')
        .select('full_name, date_of_birth, gender, contact_number, emergency_contact_number')
        .eq('id', user.id)
        .maybeSingle(),
    ])
    isRegistered = reg?.status === 'CONFIRMED'
    // Fall back to Google OAuth metadata if users.full_name is empty for some reason
    const oauthName = (user.user_metadata?.full_name as string | undefined)
      ?? (user.user_metadata?.name as string | undefined)
      ?? null
    if (profile) {
      participantInitial = {
        fullName: profile.full_name ?? oauthName,
        dateOfBirth: profile.date_of_birth ?? null,
        gender: profile.gender ?? null,
        contactNumber: profile.contact_number ?? null,
        emergencyContactNumber: profile.emergency_contact_number ?? null,
      }
    } else {
      participantInitial = { ...participantInitial, fullName: oauthName }
    }
  }

  // Fetch a few extra so we can filter out deactivated users client-side
  // and still end up with up to 5 to render.
  const { data: attendeeRows } = await adminClient
    .from('event_registrations')
    .select('users(avatar_url, full_name, deleted_at)')
    .eq('event_id', event.id)
    .eq('status', 'CONFIRMED')
    .order('created_at', { ascending: true })
    .limit(20)

  type AttendeeRow = { users: { avatar_url: string | null; full_name: string | null; deleted_at: string | null } | null }
  const attendees = ((attendeeRows ?? []) as unknown as AttendeeRow[])
    .map(r => r.users)
    .filter(u => u && !u.deleted_at)
    .slice(0, 5) as { avatar_url: string | null; full_name: string | null }[]

  let bannerImages: string[] = []
  try { bannerImages = JSON.parse(event.banner_images ?? '[]') as string[] }
  catch { /* empty */ }
  if (bannerImages.length === 0 && event.cover_url) bannerImages = [event.cover_url]

  // Custom additional fields the admin defined for this event
  let additionalFields: AdditionalField[] = []
  try { additionalFields = JSON.parse(event.additional_fields ?? '[]') as AdditionalField[] }
  catch { additionalFields = [] }

  const hasBanners = bannerImages.length > 0
  const dateLong  = fmtDateLong(event.event_date)
  const startTime = fmtTime(event.event_date)
  const endTime   = fmtTime(event.end_date)
  const priceLabel = event.price_paise === 0 ? 'Free' : `₹${(event.price_paise / 100).toLocaleString('en-IN')}`
  const shareUrl   = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.strideclub.in'}/events/${slug}`

  const firstNames = attendees.slice(0, 2).map(a => a.full_name?.split(' ')[0] ?? 'Someone')
  const othersCount = Math.max(0, (confirmedCount ?? 0) - 2)

  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-hidden pb-32 sm:pb-20'>

      {/* Refresh on back/forward bfcache restore — so post-registration the page
          can't show a stale "Register" CTA after the user hits browser back. */}
      <BfcacheRefresh />

      {/* Live ambient orbs — radial gradients with gentle drift */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='orb orb-yellow animate-orb-drift top-[-14%] left-[-10%] w-[48rem] h-[48rem]' />
        <div className='orb orb-yellow animate-orb-drift-reverse top-[28%] right-[-14%] w-[38rem] h-[38rem]' style={{ animationDelay: '3s' }} />
        <div className='orb orb-white animate-orb-drift bottom-[-18%] left-[18%] w-[44rem] h-[44rem]' style={{ animationDelay: '6s' }} />
      </div>

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

          {/* Going section — desktop */}
          {attendees.length > 0 && (
            <div className='hidden lg:block mt-6'>
              <p className='text-white/40 text-xs uppercase tracking-widest mb-3'>Going</p>
              <div className='flex -space-x-2 mb-2'>
                {attendees.map((a, i) => (
                  <div
                    key={i}
                    className='w-8 h-8 rounded-full border-2 border-stride-purple-primary overflow-hidden bg-stride-yellow-accent/20 flex items-center justify-center'
                    style={{ zIndex: attendees.length - i }}
                  >
                    {a.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatar_url} alt={a.full_name ?? ''} className='w-full h-full object-cover' loading='lazy' fetchPriority='low' />
                    ) : (
                      <span className='text-stride-yellow-accent text-xs font-bold'>
                        {(a.full_name ?? '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {firstNames.length > 0 && (
                <p className='text-white/40 text-xs'>
                  {firstNames.join(', ')}{othersCount > 0 ? ' and others' : ''}
                </p>
              )}
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
          <SectionReveal delay={0.04}>
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
          </SectionReveal>

          {/* ── When & Where (clubbed) ── */}
          {(dateLong || event.location) && (
            <SectionReveal delay={0.12}>
              <div className='mt-7 rounded-2xl border border-white/10 bg-white/4 overflow-hidden'>
                {dateLong && event.event_date && (
                  <div className='flex items-start gap-4 px-5 py-4 border-b border-white/8'>
                    {/* Mini calendar chip */}
                    <div className='w-11 h-11 rounded-xl bg-white/8 border border-white/12 flex flex-col items-center justify-center shrink-0 leading-none gap-0.5 mt-0.5'>
                      <span className='text-stride-yellow-accent text-[8px] font-black uppercase tracking-widest'>
                        {fmtMonth(event.event_date)}
                      </span>
                      <span className='text-white font-bold text-base leading-none'>
                        {fmtDay(event.event_date)}
                      </span>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-white/40 text-[10px] font-bold uppercase tracking-widest mb-0.5'>When</p>
                      <p className='text-white font-semibold text-base'>{dateLong}</p>
                      {(startTime || endTime) && (
                        <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-sm'>
                          {startTime && (
                            <span className='text-white/70'>
                              <span className='text-white/35 text-[10px] uppercase tracking-widest mr-1'>Starts</span>
                              {startTime}
                            </span>
                          )}
                          {startTime && endTime && <span className='text-white/20'>·</span>}
                          {endTime && (
                            <span className='text-white/70'>
                              <span className='text-white/35 text-[10px] uppercase tracking-widest mr-1'>Ends</span>
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
                      <p className='text-white/40 text-[10px] font-bold uppercase tracking-widest mb-0.5'>Where</p>
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
            </SectionReveal>
          )}

          {/* ── Post-run + Route (clubbed) ── */}
          {(event.post_run_location_url || event.strava_route_url) && (
            <SectionReveal delay={0.16}>
              <div className='mt-3 rounded-2xl border border-white/10 bg-white/4 overflow-hidden'>
                {event.post_run_location_url && (
                  <a
                    href={event.post_run_location_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-4 px-5 py-4 hover:bg-white/4 transition-colors group/row'
                    style={event.strava_route_url ? { borderBottom: '1px solid rgba(255,255,255,0.08)' } : undefined}
                  >
                    <div className='w-11 h-11 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center shrink-0'>
                      <Coffee size={15} className='text-white/50 group-hover/row:text-stride-yellow-accent transition-colors' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-white/40 text-[10px] font-bold uppercase tracking-widest mb-0.5'>Post-run</p>
                      <p className='text-white font-semibold text-sm group-hover/row:text-stride-yellow-accent transition-colors'>
                        Where we gather after the run
                      </p>
                    </div>
                    <ExternalLink size={14} className='text-white/30 shrink-0 group-hover/row:text-stride-yellow-accent transition-colors' />
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
                      <p className='text-white/40 text-[10px] font-bold uppercase tracking-widest mb-0.5'>Route</p>
                      <p className='text-white font-semibold text-sm group-hover/row:text-stride-yellow-accent transition-colors'>
                        View the run route on Strava
                      </p>
                    </div>
                    <ExternalLink size={14} className='text-white/30 shrink-0 group-hover/row:text-stride-yellow-accent transition-colors' />
                  </a>
                )}
              </div>
            </SectionReveal>
          )}

          {/* ── Registration box (Luma-style) ── */}
          <SectionReveal delay={0.18}>
            <div className='hidden sm:block mt-5 rounded-2xl border border-white/15 bg-white/3 overflow-hidden'>
              <div className='px-5 py-3 border-b border-white/8 flex items-center justify-between'>
                <p className='text-white/50 text-xs font-bold uppercase tracking-widest'>Registration</p>
                <ShareButton title={event.name} url={shareUrl} />
              </div>
              <div className='px-5 py-5'>
                <div className='flex items-center justify-between gap-4 mb-4'>
                  <p className='text-white/60 text-sm'>
                    {isRegistered
                      ? "You're registered for this event."
                      : isPast
                      ? 'This event has concluded.'
                      : isFull
                      ? 'This event is full.'
                      : 'Sign up and lace up — see you on the run.'}
                  </p>
                  <p className='text-2xl font-bold text-white shrink-0'>{priceLabel}</p>
                </div>
                <RegisterButton
                  eventId={event.id}
                  eventSlug={slug}
                  pricePaise={event.price_paise}
                  isFull={isFull}
                  isRegistered={isRegistered}
                  isPast={isPast}
                  isLoggedIn={isLoggedIn}
                  autoOpen={autoOpenModal}
                  initial={participantInitial}
                  additionalFields={additionalFields}
                  razorpayKeyId={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}
                />
              </div>
            </div>
          </SectionReveal>

          {/* Mobile: share button only — register is sticky at bottom */}
          <div className='sm:hidden mt-5 flex justify-end'>
            <ShareButton title={event.name} url={shareUrl} />
          </div>

          {/* Mobile: going count */}
          {attendees.length > 0 && (
            <SectionReveal delay={0.22}>
              <div className='sm:hidden mt-4 flex items-center gap-3'>
                <div className='flex -space-x-2'>
                  {attendees.slice(0, 3).map((a, i) => (
                    <div key={i} className='w-7 h-7 rounded-full border-2 border-stride-purple-primary overflow-hidden bg-stride-yellow-accent/20 flex items-center justify-center' style={{ zIndex: 3 - i }}>
                      {a.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatar_url} alt='' className='w-full h-full object-cover' loading='lazy' />
                      ) : (
                        <span className='text-stride-yellow-accent text-[10px] font-bold'>{(a.full_name ?? '?').charAt(0)}</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className='text-white/45 text-sm'>Runners going</p>
              </div>
            </SectionReveal>
          )}

          {/* About Event */}
          {event.details && (
            <SectionReveal delay={0.26}>
              <div className='mt-8'>
                <p className='text-white/40 text-xs font-bold uppercase tracking-widest mb-4'>About Event</p>
                <div className='prose prose-invert prose-sm max-w-none prose-p:text-white/75 prose-p:leading-relaxed prose-headings:text-white prose-headings:font-bold prose-a:text-stride-yellow-accent prose-strong:text-white prose-li:text-white prose-ul:my-2 prose-ol:my-2 [&_ul>li::marker]:text-stride-yellow-accent [&_ol>li::marker]:text-stride-yellow-accent'>
                  <ReactMarkdown>{event.details}</ReactMarkdown>
                </div>
              </div>
            </SectionReveal>
          )}

          {/* Meeting-point map */}
          {event.location && (
            <SectionReveal delay={0.32}>
              <div className='mt-8'>
                <p className='text-white/40 text-xs font-bold uppercase tracking-widest mb-4'>Meet here</p>
                <MapEmbed locationName={event.location} locationUrl={event.location_url} />
              </div>
            </SectionReveal>
          )}

        </div>
      </div>

      {/* Sticky mobile registration bar */}
      <div className='fixed bottom-0 left-0 right-0 sm:hidden bg-stride-purple-primary/95 backdrop-blur-xl border-t border-white/10 px-4 py-4 z-40'>
        <div className='flex items-center gap-4 max-w-lg mx-auto'>
          <div>
            <p className='text-white/40 text-xs'>Entry fee</p>
            <p className='text-white font-bold text-xl leading-none mt-0.5'>{priceLabel}</p>
          </div>
          <div className='flex-1'>
            <RegisterButton
              eventId={event.id}
              eventSlug={slug}
              pricePaise={event.price_paise}
              isFull={isFull}
              isRegistered={isRegistered}
              isPast={isPast}
              isLoggedIn={isLoggedIn}
              autoOpen={autoOpenModal}
              initial={participantInitial}
              additionalFields={additionalFields}
              razorpayKeyId={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}
            />
          </div>
        </div>
      </div>

    </main>
  )
}
