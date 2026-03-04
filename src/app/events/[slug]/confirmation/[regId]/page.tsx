import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { generateQrToken } from '@/lib/qr-token'
import { QrTicket } from '@/components/events/qr-ticket'

type Props = { params: Promise<{ slug: string; regId: string }> }

export const metadata: Metadata = {
  title: 'Booking Confirmation — Stride Run Club',
  description: 'Your event registration is confirmed.',
}

function formatDate(d: string | null) {
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

export default async function ConfirmationPage({ params }: Props) {
  const { regId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch registration with event details
  const { data: registration } = await adminClient
    .from('event_registrations')
    .select('id, user_id, status, event_id')
    .eq('id', regId)
    .single()

  if (!registration || registration.user_id !== user.id || registration.status !== 'CONFIRMED') {
    notFound()
  }

  const { data: event } = await adminClient
    .from('events')
    .select('id, name, event_date, location')
    .eq('id', registration.event_id)
    .single()

  if (!event) notFound()

  const { data: profile } = await adminClient
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const token = generateQrToken(registration.id, event.id, user.id)
  const eventDate = formatDate(event.event_date)

  return (
    <main className='min-h-screen bg-stride-purple-primary flex flex-col items-center pt-24 pb-16 px-4'>
      <QrTicket
        token={token}
        registrationId={registration.id}
        eventName={event.name}
        eventDate={eventDate}
        eventLocation={event.location ?? null}
        userName={profile?.full_name ?? user.email ?? ''}
        userEmail={profile?.email ?? user.email ?? ''}
      />
    </main>
  )
}
