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
    <div className='max-w-2xl'>
      <h1 className='text-3xl font-bold text-white mb-8'>Edit Event</h1>
      <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-8'>
        <EventForm
          action={action}
          submitLabel='Save Changes'
          defaultValues={{
            name: event.name ?? undefined,
            subtitle: event.subtitle ?? undefined,
            description: event.description ?? undefined,
            details: event.details ?? undefined,
            location: event.location ?? undefined,
            locationUrl: event.location_url ?? undefined,
            stravaRouteUrl: event.strava_route_url ?? undefined,
            eventDate: toDatetimeLocal(event.event_date),
            endDate: toDatetimeLocal(event.end_date),
            capacity: event.capacity ?? undefined,
            pricePaise: event.price_paise,
            status: (event.status as 'DRAFT' | 'PUBLISHED' | 'CANCELLED') ?? 'DRAFT',
            coverUrl: event.cover_url ?? undefined,
          }}
        />
      </div>
    </div>
  )
}
