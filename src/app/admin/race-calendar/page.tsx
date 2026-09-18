import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'
import { RacesAdminClient, type AdminRaceRow } from '@/components/admin/races-admin-client'
import { requireFullAdmin } from '@/lib/auth/admin-access'
import { istDayKey } from '@/lib/utils/ist'
import type { RaceStatus } from '@/types/race'

export const metadata = { title: 'Race calendar — Admin' }

type RaceAdminRowDb = {
  id: string
  name: string
  slug: string
  status: RaceStatus
  race_date: string
  has_start_time: boolean
  registration_deadline: string | null
  city: string
  venue: string | null
  organizer: string | null
  distances: string[] | null
  registration_url: string | null
  coupon_code: string | null
  discount_percent: number | null
  poster_images: string[] | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

async function fetchAdminRaces(): Promise<{ rows: AdminRaceRow[]; todayKey: string }> {
  const { data } = await adminClient
    .from('races')
    .select('id, name, slug, status, race_date, has_start_time, registration_deadline, city, venue, organizer, distances, registration_url, coupon_code, discount_percent, poster_images, created_at, updated_at, created_by, updated_by')
    .order('race_date', { ascending: false })

  const rows: AdminRaceRow[] = ((data ?? []) as unknown as RaceAdminRowDb[]).map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    status: r.status,
    raceDate: r.race_date,
    hasStartTime: r.has_start_time,
    registrationDeadline: r.registration_deadline,
    city: r.city,
    venue: r.venue,
    organizer: r.organizer,
    distances: r.distances ?? [],
    registrationUrl: r.registration_url,
    couponCode: r.coupon_code,
    discountPercent: r.discount_percent,
    thumbUrl: r.poster_images?.[0] ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  }))

  return { rows, todayKey: istDayKey(Date.now()) }
}

export default async function AdminRaceCalendarPage() {
  // ADMIN only. A LEAD reaching this route is redirected to check-in.
  await requireFullAdmin()

  const { rows, todayKey } = await fetchAdminRaces()
  const published = rows.filter(r => r.status === 'PUBLISHED').length
  const upcoming = rows.filter(r => r.status === 'PUBLISHED' && istDayKey(r.raceDate) >= todayKey).length
  const withCoupon = rows.filter(r => r.couponCode).length

  return (
    <div>
      <div className='flex items-center justify-between mb-6 gap-4'>
        <div>
          <h1 className='text-3xl font-bold text-white'>Race calendar</h1>
          <p className='text-white/40 text-sm mt-1'>Third-party races Stride points runners to. {rows.length} total · {published} published · {upcoming} upcoming</p>
        </div>
        <Link
          href='/admin/race-calendar/new'
          className='bg-stride-yellow-accent text-copy-black font-semibold px-5 py-2.5 rounded-md hover:bg-stride-yellow-accent/90 transition-colors text-sm min-h-11 flex items-center gap-2 shrink-0'
        >
          + New Race
        </Link>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6'>
        {[
          { label: 'Total races', value: rows.length },
          { label: 'Published', value: published },
          { label: 'Upcoming', value: upcoming },
          { label: 'With coupon', value: withCoupon },
        ].map(s => (
          <div key={s.label} className='bg-white/5 border border-white/10 rounded-2xl p-4'>
            <p className='text-white/40 text-xs'>{s.label}</p>
            <p className='text-2xl font-bold text-stride-yellow-accent mt-1'>{s.value}</p>
          </div>
        ))}
      </div>

      <RacesAdminClient races={rows} todayKey={todayKey} />
    </div>
  )
}
