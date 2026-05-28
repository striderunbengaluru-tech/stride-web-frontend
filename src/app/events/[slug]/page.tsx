import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { RegisterButton } from '@/components/events/register-button'
import { EventHero } from '@/components/events/event-hero'
import { SectionReveal } from '@/components/ui/section-reveal'
import { ArrowLeft, Calendar, MapPin, Route, Coffee } from 'lucide-react'
import { MapEmbed } from '@/components/events/map-embed'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: event } = await adminClient
    .from('events')
    .select('name, cover_url, banner_images')
    .eq('slug', slug)
    .single()
  if (!event) return {}

  let ogImage = event.cover_url
  if (!ogImage && event.banner_images) {
    try { ogImage = (JSON.parse(event.banner_images) as string[])[0] ?? null } catch {}
  }

  return {
    title: `${event.name} — Stride Run Club`,
    openGraph: ogImage ? { images: [ogImage] } : undefined,
  }
}

function formatDateLong(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function formatDateChip(d: string | null) {
  if (!d) return null
  const dt = new Date(d)
  return {
    month: dt.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    day: dt.getDate(),
  }
}

function getEventStatus(eventDate: string | null): { label: string; classes: string } {
  if (!eventDate) return { label: 'Coming Soon', classes: 'bg-white/15 text-white/70' }
  const diff = new Date(eventDate).getTime() - Date.now()
  if (diff < 0) return { label: 'Completed', classes: 'bg-white/15 text-white/60' }
  if (diff < 3_600_000) {
    const mins = Math.floor(diff / 60_000)
    return { label: `In ${mins}m`, classes: 'bg-stride-yellow-accent text-copy-black' }
  }
  if (diff < 86_400_000) {
    const hrs = Math.floor(diff / 3_600_000)
    return { label: `In ${hrs}h`, classes: 'bg-stride-yellow-accent text-copy-black' }
  }
  if (diff < 7 * 86_400_000) {
    const days = Math.floor(diff / 86_400_000)
    return { label: days === 1 ? 'Tomorrow' : `In ${days}d`, classes: 'bg-stride-yellow-accent text-copy-black' }
  }
  const days = Math.floor(diff / 86_400_000)
  return { label: `${days} days away`, classes: 'bg-white/15 text-white/70' }
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params

  const { data: event } = await adminClient
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!event || event.status === 'DRAFT') notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  // Confirmed seat count
  const { count: confirmedCount } = await adminClient
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('status', 'CONFIRMED')

  const isFull = !!event.capacity && (confirmedCount ?? 0) >= event.capacity
  // confirmedCount used only for isFull — not shown to users

  // Current user registration
  let isRegistered = false
  if (user) {
    const { data: reg } = await adminClient
      .from('event_registrations')
      .select('status')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .maybeSingle()
    isRegistered = reg?.status === 'CONFIRMED'
  }

  // First 5 attendee avatars
  const { data: attendeeRows } = await adminClient
    .from('event_registrations')
    .select('users(avatar_url, full_name)')
    .eq('event_id', event.id)
    .eq('status', 'CONFIRMED')
    .order('created_at', { ascending: true })
    .limit(5)

  type AttendeeRow = { users: { avatar_url: string | null; full_name: string | null } | null }
  const attendees = ((attendeeRows ?? []) as unknown as AttendeeRow[])
    .map(r => r.users)
    .filter(Boolean) as { avatar_url: string | null; full_name: string | null }[]

  // Banner images (JSON array) + fallback to cover_url
  let bannerImages: string[] = []
  try { bannerImages = JSON.parse(event.banner_images ?? '[]') as string[] }
  catch { /* empty */ }
  if (bannerImages.length === 0 && event.cover_url) bannerImages = [event.cover_url]

  const hasBanners = bannerImages.length > 0
  const dateChip = formatDateChip(event.event_date)
  const dateLong = formatDateLong(event.event_date)
  const startTime = formatTime(event.event_date)
  const endTime = formatTime(event.end_date)
  const eventStatus = getEventStatus(event.event_date)
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/events/${slug}`

  return (
    <main className='min-h-screen bg-stride-purple-primary pb-32 sm:pb-20'>

      {/* Hero */}
      {hasBanners ? (
        <div className='mt-16'>
          <EventHero images={bannerImages} eventName={event.name} pricePaise={event.price_paise} />
        </div>
      ) : (
        <div className='mt-16 w-full h-72 sm:h-96 bg-linear-to-br from-stride-purple-primary to-stride-yellow-accent/15 relative'>
          <div className='absolute inset-0 bg-linear-to-t from-stride-purple-primary/90 to-transparent' />
          {/* Price badge */}
          <div className='absolute top-4 right-4'>
            {event.price_paise === 0 ? (
              <span className='bg-green-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full'>Free Event</span>
            ) : (
              <span className='bg-black/50 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full'>
                ₹{(event.price_paise / 100).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      )}

      <div className='max-w-2xl mx-auto px-4 -mt-2 relative z-10'>

        {/* Back navigation */}
        <Link
          href='/events'
          className='inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors mb-6 group'
        >
          <ArrowLeft size={15} className='group-hover:-translate-x-0.5 transition-transform' />
          All Events
        </Link>

        {/* Status + countdown chip */}
        <SectionReveal>
          <div className='flex items-center gap-3 mb-4'>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${eventStatus.classes}`}>
              {eventStatus.label}
            </span>
          </div>
        </SectionReveal>

        {/* Title + subtitle */}
        <SectionReveal delay={0.05}>
          <h1 className='text-3xl sm:text-4xl font-bold text-white leading-tight'>
            {event.name}
          </h1>
          {event.subtitle && (
            <p className='text-white/60 text-base mt-2'>{event.subtitle}</p>
          )}
        </SectionReveal>

        {/* Attendee avatar stack */}
        {attendees.length > 0 && (
          <SectionReveal delay={0.1}>
            <div className='flex items-center gap-3 mt-5'>
              <div className='flex -space-x-2'>
                {attendees.map((a, i) => (
                  <div
                    key={i}
                    className='w-8 h-8 rounded-full border-2 border-stride-purple-primary overflow-hidden bg-stride-yellow-accent/20 flex items-center justify-center'
                    style={{ zIndex: attendees.length - i }}
                  >
                    {a.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.avatar_url}
                        alt={a.full_name ?? ''}
                        className='w-full h-full object-cover'
                        loading='lazy'
                        fetchPriority='low'
                      />
                    ) : (
                      <span className='text-stride-yellow-accent text-xs font-bold'>
                        {(a.full_name ?? '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className='text-white/50 text-sm'>People are joining</p>
            </div>
          </SectionReveal>
        )}

        {/* Info card */}
        <SectionReveal delay={0.15}>
          <div className='mt-6 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl overflow-hidden'>

            {/* Fee row */}
            <div className='flex items-center gap-4 px-5 py-4 border-b border-white/10'>
              <div className='w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0'>
                <span className='text-stride-yellow-accent text-base font-bold'>₹</span>
              </div>
              <div>
                <p className='text-white/40 text-xs'>Event Fee</p>
                <p className='text-white font-semibold text-base'>
                  {event.price_paise === 0 ? 'Free' : `₹${(event.price_paise / 100).toLocaleString('en-IN')}`}
                </p>
              </div>
            </div>

            {/* Date row */}
            {dateLong && (
              <div className='flex items-center gap-4 px-5 py-4 border-b border-white/10'>
                <div className='w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0 overflow-hidden'>
                  {dateChip ? (
                    <div className='text-center leading-none'>
                      <p className='text-stride-yellow-accent text-[9px] font-bold uppercase tracking-widest'>
                        {dateChip.month}
                      </p>
                      <p className='text-white font-bold text-base'>{dateChip.day}</p>
                    </div>
                  ) : (
                    <Calendar size={18} className='text-white/60' />
                  )}
                </div>
                <div>
                  <p className='text-white/40 text-xs'>Date</p>
                  <p className='text-white font-semibold text-sm'>{dateLong}</p>
                  {startTime && (
                    <p className='text-white/50 text-xs mt-0.5'>
                      {startTime}{endTime ? ` – ${endTime}` : ''}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Meeting point row */}
            {event.location && (
              <div className='border-b border-white/10'>
                <div className='flex items-center gap-4 px-5 py-4'>
                  <div className='w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0'>
                    <MapPin size={18} className='text-white/60' />
                  </div>
                  <div className='min-w-0'>
                    <p className='text-white/40 text-xs'>Meeting Point</p>
                    <p className='text-white font-semibold text-sm truncate'>{event.location}</p>
                  </div>
                </div>
                {/* Embedded map */}
                <div className='px-4 pb-4'>
                  <MapEmbed locationName={event.location} locationUrl={event.location_url} />
                </div>
              </div>
            )}

            {/* Post-run gather point row */}
            {event.post_run_location_url && (
              <div className='flex items-center gap-4 px-5 py-4 border-b border-white/10'>
                <div className='w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0'>
                  <Coffee size={18} className='text-white/60' />
                </div>
                <div>
                  <p className='text-white/40 text-xs'>Post-Run Gather Point</p>
                  <a
                    href={event.post_run_location_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-white font-semibold text-sm hover:text-stride-yellow-accent transition-colors underline underline-offset-2'
                  >
                    View on Maps
                  </a>
                </div>
              </div>
            )}

            {/* Route row */}
            {event.strava_route_url && (
              <div className='flex items-center gap-4 px-5 py-4'>
                <div className='w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0'>
                  <Route size={18} className='text-white/60' />
                </div>
                <div>
                  <p className='text-white/40 text-xs'>Route</p>
                  <a
                    href={event.strava_route_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-white font-semibold text-sm hover:text-stride-yellow-accent transition-colors underline underline-offset-2'
                  >
                    View Route
                  </a>
                </div>
              </div>
            )}
          </div>
        </SectionReveal>

        {/* Desktop registration card */}
        <SectionReveal delay={0.2}>
          <div className='mt-6 hidden sm:block bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-6'>
            <div className='mb-4'>
              <p className='text-white/40 text-xs uppercase tracking-wider'>Registration</p>
              <p className='text-3xl font-bold text-white mt-1'>
                {event.price_paise === 0 ? 'Free' : `₹${(event.price_paise / 100).toLocaleString('en-IN')}`}
              </p>
            </div>
            <RegisterButton
              eventId={event.id}
              pricePaise={event.price_paise}
              isFull={isFull}
              isRegistered={isRegistered}
              isLoggedIn={isLoggedIn}
              razorpayKeyId={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}
            />
          </div>
        </SectionReveal>

        {/* Event details */}
        {event.details && (
          <SectionReveal delay={0.25}>
            <div className='mt-6 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-6'>
              <h2 className='text-white font-bold text-lg mb-4'>Event Details</h2>
              <div className='prose prose-invert prose-sm max-w-none prose-p:text-white/70 prose-headings:text-white prose-headings:font-bold prose-a:text-stride-yellow-accent prose-strong:text-white prose-li:text-white/70 prose-ul:my-2 prose-ol:my-2'>
                <ReactMarkdown>{event.details}</ReactMarkdown>
              </div>
            </div>
          </SectionReveal>
        )}

        {/* Share */}
        <SectionReveal delay={0.3}>
          <div className='mt-6 flex gap-3'>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${event.name} — ${shareUrl}`)}`}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 text-center py-2.5 rounded-xl border border-white/15 text-white/50 hover:border-green-500/40 hover:text-green-400 transition-colors text-sm'
            >
              WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.name)}&url=${encodeURIComponent(shareUrl)}`}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 text-center py-2.5 rounded-xl border border-white/15 text-white/50 hover:border-sky-500/40 hover:text-sky-400 transition-colors text-sm'
            >
              X / Twitter
            </a>
          </div>
        </SectionReveal>

      </div>

      {/* Sticky mobile registration bar */}
      <div className='fixed bottom-0 left-0 right-0 sm:hidden bg-stride-purple-primary/95 backdrop-blur-xl border-t border-white/10 px-4 py-4 z-50'>
        <div className='flex items-center gap-4 max-w-lg mx-auto'>
          <div>
            <p className='text-white/40 text-xs'>Registration</p>
            <p className='text-white font-bold text-lg'>
              {event.price_paise === 0 ? 'Free' : `₹${(event.price_paise / 100).toLocaleString('en-IN')}`}
            </p>
          </div>
          <div className='flex-1'>
            <RegisterButton
              eventId={event.id}
              pricePaise={event.price_paise}
              isFull={isFull}
              isRegistered={isRegistered}
              isLoggedIn={isLoggedIn}
              razorpayKeyId={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}
            />
          </div>
        </div>
      </div>

    </main>
  )
}
