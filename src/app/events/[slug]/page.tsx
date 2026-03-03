import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Image from 'next/image'
import type { Metadata } from 'next'
import { and, count, eq } from 'drizzle-orm'
import ReactMarkdown from 'react-markdown'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { events, eventRegistrations } from '@/lib/db/schema'
import { RegisterButton } from '@/components/events/register-button'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [event] = await db
    .select({ name: events.name, description: events.description })
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1)
  if (!event) return {}
  return { title: `${event.name} — Stride Run Club`, description: event.description ?? undefined }
}

function formatDate(d: Date | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params

  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1)
  if (!event || event.status === 'DRAFT') notFound()

  const session = await auth.api.getSession({ headers: await headers() })
  const isLoggedIn = !!session

  // Check confirmed seat count
  const [{ confirmedCount }] = await db
    .select({ confirmedCount: count() })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.status, 'CONFIRMED')))

  const isFull = !!event.capacity && confirmedCount >= event.capacity

  // Check if current user is registered
  let isRegistered = false
  if (session) {
    const [reg] = await db
      .select({ status: eventRegistrations.status })
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.userId, session.user.id)))
      .limit(1)
    isRegistered = reg?.status === 'CONFIRMED'
  }

  const startDate = formatDate(event.eventDate)
  const endDate = formatDate(event.endDate)
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/events/${slug}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${event.name} — ${shareUrl}`)}`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${event.name}`)}&url=${encodeURIComponent(shareUrl)}`

  return (
    <main className='min-h-screen bg-stride-purple-primary pb-20'>
      {/* Hero */}
      <div className='relative w-full h-64 sm:h-80 mt-16 bg-gradient-to-br from-stride-purple-primary to-stride-yellow-accent/20'>
        {event.coverUrl && (
          <Image
            src={event.coverUrl}
            alt={event.name}
            fill
            className='object-cover'
            priority
            sizes='100vw'
          />
        )}
        <div className='absolute inset-0 bg-gradient-to-t from-stride-purple-primary via-black/30 to-transparent' />
        <div className='absolute bottom-6 left-0 right-0 px-6 max-w-3xl mx-auto'>
          <span className='text-stride-yellow-accent text-xs font-bold uppercase tracking-widest'>
            {event.pricePaise === 0 ? 'Free Event' : `₹${event.pricePaise / 100}`}
          </span>
          <h1 className='text-3xl sm:text-4xl font-bold text-white mt-1 line-clamp-2'>{event.name}</h1>
          {event.subtitle && <p className='text-white/70 text-base mt-1'>{event.subtitle}</p>}
        </div>
      </div>

      <div className='max-w-3xl mx-auto px-4 mt-8'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Main content */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Metadata card */}
            <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-6 space-y-4'>
              {startDate && (
                <div className='flex items-start gap-3'>
                  <span className='text-stride-yellow-accent text-lg'>📅</span>
                  <div>
                    <p className='text-white/50 text-xs uppercase tracking-wider mb-0.5'>Date & Time</p>
                    <p className='text-white text-sm'>{startDate}</p>
                    {endDate && <p className='text-white/60 text-xs mt-0.5'>Until {endDate}</p>}
                  </div>
                </div>
              )}

              {event.location && (
                <div className='flex items-start gap-3'>
                  <span className='text-stride-yellow-accent text-lg'>📍</span>
                  <div>
                    <p className='text-white/50 text-xs uppercase tracking-wider mb-0.5'>Location</p>
                    {event.locationUrl ? (
                      <a
                        href={event.locationUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-white text-sm hover:text-stride-yellow-accent transition-colors underline underline-offset-2'
                      >
                        {event.location}
                      </a>
                    ) : (
                      <p className='text-white text-sm'>{event.location}</p>
                    )}
                  </div>
                </div>
              )}

              {event.stravaRouteUrl && (
                <div className='flex items-start gap-3'>
                  <span className='text-lg'>🏃</span>
                  <div>
                    <p className='text-white/50 text-xs uppercase tracking-wider mb-0.5'>Route</p>
                    <a
                      href={event.stravaRouteUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-white text-sm hover:text-stride-yellow-accent transition-colors underline underline-offset-2'
                    >
                      View on Strava
                    </a>
                  </div>
                </div>
              )}

              {event.capacity && (
                <div className='flex items-start gap-3'>
                  <span className='text-stride-yellow-accent text-lg'>👥</span>
                  <div>
                    <p className='text-white/50 text-xs uppercase tracking-wider mb-0.5'>Capacity</p>
                    <p className='text-white text-sm'>{confirmedCount} / {event.capacity} registered</p>
                  </div>
                </div>
              )}
            </div>

            {/* Share */}
            <div className='flex gap-3'>
              <a
                href={whatsappUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1 text-center py-2.5 rounded-md border border-white/15 text-white/70 hover:border-green-500/50 hover:text-green-400 transition-colors text-sm'
              >
                Share on WhatsApp
              </a>
              <a
                href={twitterUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1 text-center py-2.5 rounded-md border border-white/15 text-white/70 hover:border-sky-500/50 hover:text-sky-400 transition-colors text-sm'
              >
                Share on X
              </a>
            </div>

            {/* Description / Details */}
            {event.details ? (
              <div className='prose prose-invert prose-sm max-w-none bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-6'>
                <ReactMarkdown>{event.details}</ReactMarkdown>
              </div>
            ) : event.description ? (
              <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-6'>
                <p className='text-white/70 text-sm leading-relaxed'>{event.description}</p>
              </div>
            ) : null}
          </div>

          {/* Sidebar — registration */}
          <div className='lg:col-span-1'>
            <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-6 sticky top-24'>
              <p className='text-white/50 text-xs uppercase tracking-wider mb-2'>Registration</p>
              <p className='text-3xl font-bold text-white mb-1'>
                {event.pricePaise === 0 ? 'Free' : `₹${event.pricePaise / 100}`}
              </p>
              {event.capacity && (
                <p className='text-white/40 text-xs mb-4'>
                  {Math.max(0, event.capacity - confirmedCount)} spots left
                </p>
              )}
              <RegisterButton
                eventId={event.id}
                pricePaise={event.pricePaise}
                isFull={isFull}
                isRegistered={isRegistered}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>
        </div>

        {/* Back link */}
        <a href='/events' className='inline-block mt-8 text-white/40 hover:text-white text-sm transition-colors'>
          ← Back to Events
        </a>
      </div>
    </main>
  )
}
