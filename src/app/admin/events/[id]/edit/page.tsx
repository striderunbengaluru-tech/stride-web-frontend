import { notFound } from 'next/navigation'
import { adminClient } from '@/lib/supabase/admin'
import { EventForm } from '@/components/admin/event-form'
import { updateEventAction } from '@/lib/actions/admin'

type Props = { params: Promise<{ id: string }> }

export const metadata = { title: 'Edit Event — Admin' }

function toDatetimeLocal(d: string | null | undefined) {
  if (!d) return undefined
  return new Date(d).toISOString().slice(0, 16)
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params

  const { data: event } = await adminClient
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) notFound()

  const action = updateEventAction.bind(null, id)

  return (
    <div>
      <h1 className='text-3xl font-bold text-white mb-6'>Edit Event</h1>
      <EventForm
        action={action}
        submitLabel='Save Changes'
        defaultValues={{
          name: event.name ?? undefined,
          subtitle: event.subtitle ?? undefined,
          details: event.details ?? undefined,
          location: event.location ?? undefined,
          locationUrl: event.location_url ?? undefined,
          postRunLocation: event.post_run_location ?? undefined,
          postRunLocationUrl: event.post_run_location_url ?? undefined,
          stravaRouteUrl: event.strava_route_url ?? undefined,
          eventDate: toDatetimeLocal(event.event_date),
          endDate: toDatetimeLocal(event.end_date),
          capacity: event.capacity ?? undefined,
          pricePaise: event.price_paise,
          showSpotsLeft: event.show_spots_left ?? false,
          status: (event.status as 'DRAFT' | 'PUBLISHED' | 'CANCELLED') ?? 'DRAFT',
          confirmationText: event.confirmation_text ?? undefined,
          termsText: event.terms_and_conditions ?? undefined,
          bannerImages: event.banner_images ?? '[]',
          additionalFields: event.additional_fields ?? '[]',
          distanceKm: event.distance_km ?? undefined,
          difficulty: event.difficulty ?? undefined,
        }}
      />
    </div>
  )
}
