import { notFound } from 'next/navigation'
import { adminClient } from '@/lib/supabase/admin'
import { EventForm } from '@/components/admin/event-form'
import { updateEventAction } from '@/lib/actions/admin'
import { utcIsoToIstLocal } from '@/lib/utils/ist'
import { requireFullAdmin } from '@/lib/auth/admin-access'

type Props = { params: Promise<{ id: string }> }

export const metadata = { title: 'Edit Event — Admin' }

export default async function EditEventPage({ params }: Props){
  // ADMIN only. A LEAD reaching this route is redirected to check-in.
  await requireFullAdmin()

  const { id } = await params

  // Applications still awaiting a decision, so the form can warn before an
  // admin switches invite-only off and assumes they were cancelled.
  const [{ data: event }, { count: pendingApplications }] = await Promise.all([
    adminClient
      .from('events')
      .select('*')
      .eq('id', id)
      .single(),
    adminClient
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('status', 'APPLIED'),
  ])

  if (!event) notFound()

  const action = updateEventAction.bind(null, id)

  return (
    <div>
      <h1 className='text-3xl font-bold text-white mb-6'>Edit Event</h1>
      <EventForm
        action={action}
        submitLabel='Save Changes'
        pendingApplications={pendingApplications ?? 0}
        defaultValues={{
          name: event.name ?? undefined,
          subtitle: event.subtitle ?? undefined,
          details: event.details ?? undefined,
          location: event.location ?? undefined,
          locationUrl: event.location_url ?? undefined,
          postRunLocation: event.post_run_location ?? undefined,
          postRunLocationUrl: event.post_run_location_url ?? undefined,
          stravaRouteUrl: event.strava_route_url ?? undefined,
          eventDate: utcIsoToIstLocal(event.event_date),
          endDate: utcIsoToIstLocal(event.end_date),
          capacity: event.capacity ?? undefined,
          priceRupees: event.price_paise / 100,
          showSpotsLeft: event.show_spots_left ?? false,
          isTestEvent: event.is_test_event ?? false,
          inviteOnly: event.invite_only ?? false,
          registrationsClosed: event.registrations_closed ?? false,
          confirmationEmailEnabled: event.confirmation_email_enabled ?? false,
          status: (event.status as 'DRAFT' | 'PUBLISHED' | 'CANCELLED') ?? 'DRAFT',
          confirmationText: event.confirmation_text ?? undefined,
          termsText: event.terms_and_conditions ?? undefined,
          bannerImages: event.banner_images ?? '[]',
          additionalFields: event.additional_fields ?? '[]',
          packages: event.packages ?? '[]',
          packagesEnabled: event.packages_enabled ?? false,
          packagesMultiSelect: event.packages_multi_select ?? false,
          packagesProgressive: event.packages_progressive ?? false,
          distanceKm: event.distance_km ?? undefined,
          difficulty: event.difficulty ?? undefined,
        }}
      />
    </div>
  )
}
