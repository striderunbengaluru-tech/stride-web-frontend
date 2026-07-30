import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'
import { EventsAdminClient, type AdminEventRow } from '@/components/admin/events-admin-client'
import { validatePackageSpots } from '@/lib/events/package-spots'
import { eventPriceLabel, FREE_LABEL } from '@/lib/utils/money'
import type { EventPackage } from '@/types/event'

export const metadata = { title: 'Events — Admin' }

export default async function AdminEventsPage() {
  const [{ data: allEvents }, { data: regCounts }] = await Promise.all([
    adminClient
      .from('events')
      .select('id, name, subtitle, slug, status, event_date, end_date, location, price_paise, capacity, banner_images, cover_url, created_at, packages, packages_enabled')
      .order('event_date', { ascending: false }),
    adminClient
      .from('event_registrations')
      .select('event_id, status'),
  ])

  // Count confirmed registrations per event
  const confirmedByEvent = new Map<string, number>()
  for (const reg of regCounts ?? []) {
    if (reg.status === 'CONFIRMED') {
      confirmedByEvent.set(reg.event_id, (confirmedByEvent.get(reg.event_id) ?? 0) + 1)
    }
  }

  const rows: AdminEventRow[] = (allEvents ?? []).map(e => {
    let thumbUrl: string | null = e.cover_url ?? null
    try {
      const arr = JSON.parse(e.banner_images ?? '[]') as string[]
      if (arr[0]) thumbUrl = arr[0]
    } catch { /* keep cover_url */ }

    // Events whose package spots don't add up to capacity — the state the
    // spotsTotal backfill leaves legacy events in. They still register fine
    // (unbudgeted packages fall back to total capacity), but the next save is
    // blocked until fixed, so flag them here rather than letting the admin find
    // out mid-edit.
    let packages: EventPackage[] = []
    try {
      const parsed = JSON.parse(e.packages ?? '[]')
      if (Array.isArray(parsed)) packages = parsed as EventPackage[]
    } catch { /* treated as no packages */ }
    const spotsMismatch = Boolean(
      validatePackageSpots(packages, e.capacity ?? null, e.packages_enabled ?? false)
    )
    const priceLabel = eventPriceLabel(e.price_paise ?? 0, packages, e.packages_enabled ?? false)

    return {
      id: e.id,
      name: e.name ?? '',
      subtitle: e.subtitle ?? null,
      slug: e.slug ?? '',
      status: (e.status ?? 'DRAFT') as 'DRAFT' | 'PUBLISHED' | 'CANCELLED',
      eventDate: e.event_date ?? null,
      endDate: e.end_date ?? null,
      location: e.location ?? null,
      pricePaise: e.price_paise ?? 0,
      capacity: e.capacity ?? null,
      confirmedCount: confirmedByEvent.get(e.id) ?? 0,
      // Reuses the `packages` already parsed above. Deriving the label from
      // pricePaise alone showed "Free" for every package event, since packages
      // leave that column at 0.
      priceLabel,
      isFree: priceLabel === FREE_LABEL,
      spotsMismatch,
      thumbUrl,
      createdAt: e.created_at ?? '',
    }
  })

  const published = rows.filter(r => r.status === 'PUBLISHED').length
  const upcoming = rows.filter(r => r.status === 'PUBLISHED' && r.eventDate && new Date(r.eventDate) >= new Date()).length
  const totalConfirmed = Array.from(confirmedByEvent.values()).reduce((s, n) => s + n, 0)

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold text-white'>Events</h1>
          <p className='text-white/40 text-sm mt-1'>{rows.length} total · {published} published · {upcoming} upcoming</p>
        </div>
        <Link
          href='/admin/events/new'
          className='bg-stride-yellow-accent text-copy-black font-semibold px-5 py-2.5 rounded-md hover:bg-stride-yellow-accent/90 transition-colors text-sm min-h-11 flex items-center gap-2'
        >
          + New Event
        </Link>
      </div>

      {/* Summary stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6'>
        {[
          { label: 'Total events', value: rows.length },
          { label: 'Published', value: published },
          { label: 'Upcoming', value: upcoming },
          { label: 'Total registrations', value: totalConfirmed },
        ].map(s => (
          <div key={s.label} className='bg-white/5 border border-white/10 rounded-2xl p-4'>
            <p className='text-white/40 text-xs'>{s.label}</p>
            <p className='text-2xl font-bold text-stride-yellow-accent mt-1'>{s.value}</p>
          </div>
        ))}
      </div>

      <EventsAdminClient events={rows} />
    </div>
  )
}
