import { notFound } from 'next/navigation'
import { adminClient } from '@/lib/supabase/admin'
import { RaceForm } from '@/components/admin/race-form'
import { updateRaceAction } from '@/lib/actions/admin-races'
import { utcIsoToIstLocal } from '@/lib/utils/ist'
import { requireFullAdmin } from '@/lib/auth/admin-access'
import type { RaceRow } from '@/types/race'

type Props = { params: Promise<{ id: string }> }

export const metadata = { title: 'Edit Race — Admin' }

// 'YYYY-MM-DDTHH:mm' IST → the two inputs the form holds.
const DATE_END = 10
const TIME_START = 11
const TIME_END = 16

export default async function EditRacePage({ params }: Props) {
  // ADMIN only. A LEAD reaching this route is redirected to check-in.
  await requireFullAdmin()

  const { id } = await params

  const { data } = await adminClient
    .from('races')
    .select('id, name, slug, description, poster_images, race_date, has_start_time, city, venue, organizer, distances, registration_url, coupon_code, discount_percent, registration_deadline, status, updated_at')
    .eq('id', id)
    .maybeSingle()

  const race = data as unknown as RaceRow | null
  if (!race) notFound()

  const local = utcIsoToIstLocal(race.race_date) ?? ''

  return (
    <div>
      <h1 className='text-3xl font-bold text-white mb-6'>Edit Race</h1>
      <RaceForm
        action={updateRaceAction.bind(null, id)}
        submitLabel='Save Changes'
        defaultValues={{
          name: race.name,
          description: race.description ?? '',
          raceDate: local.slice(0, DATE_END),
          startTime: race.has_start_time ? local.slice(TIME_START, TIME_END) : '',
          registrationDeadline: utcIsoToIstLocal(race.registration_deadline) ?? '',
          city: race.city,
          venue: race.venue ?? '',
          organizer: race.organizer ?? '',
          distances: race.distances ?? [],
          registrationUrl: race.registration_url ?? '',
          couponCode: race.coupon_code ?? '',
          discountPercent: race.discount_percent === null ? '' : String(race.discount_percent),
          status: race.status,
          posterImages: race.poster_images ?? [],
        }}
      />
    </div>
  )
}
