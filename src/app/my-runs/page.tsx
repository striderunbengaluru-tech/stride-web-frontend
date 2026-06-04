import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { guardPreviewFeature } from '@/lib/feature-flags'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { MyRunsClient, type MyRun } from '@/components/profile/my-runs-client'

export const metadata: Metadata = {
  title: 'My Runs — Stride Run Club',
  description: 'Your upcoming registrations and the runs you’ve checked in to.',
}

type RegRow = {
  status: string | null
  checked_in_at: string | null
  events: {
    id: string
    name: string
    slug: string
    event_date: string | null
    location: string | null
    banner_images: string | null
    price_paise: number | null
  } | null
}

function firstBanner(raw: string | null): string | null {
  if (!raw) return null
  try {
    const arr = JSON.parse(raw) as string[]
    return arr[0] ?? null
  } catch {
    return null
  }
}

export default async function MyRunsPage() {
  guardPreviewFeature()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/become-a-member')

  const { data } = await adminClient
    .from('event_registrations')
    .select('status, checked_in_at, events(id, name, slug, event_date, location, banner_images, price_paise)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as unknown as RegRow[]
  const now = Date.now()

  const toRun = (r: RegRow): MyRun => ({
    id: r.events!.id,
    name: r.events!.name,
    slug: r.events!.slug,
    eventDate: r.events!.event_date,
    location: r.events!.location,
    bannerUrl: firstBanner(r.events!.banner_images),
    pricePaise: r.events!.price_paise ?? 0,
    checkedIn: !!r.checked_in_at,
  })

  // Upcoming = active (non-cancelled) registration for an event still ahead.
  const upcoming: MyRun[] = rows
    .filter(r => r.events && r.status !== 'CANCELLED')
    .filter(r => r.events!.event_date && new Date(r.events!.event_date).getTime() >= now)
    .map(toRun)
    .sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? ''))

  // Past = runs the member actually checked in to.
  const past: MyRun[] = rows
    .filter(r => r.events && r.checked_in_at)
    .map(toRun)
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''))

  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-hidden'>
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='orb orb-yellow animate-orb-drift top-[-12%] left-[-6%] w-[60rem] h-[60rem]' />
        <div className='orb orb-white animate-orb-drift-reverse top-[30%] right-[-12%] w-[48rem] h-[48rem]' style={{ animationDelay: '3s' }} />
      </div>

      <section className='relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-24'>
        <p className='text-stride-yellow-accent text-xs font-bold font-mono uppercase tracking-[0.25em] mb-4'>
          Your journey
        </p>
        <h1 className='text-5xl sm:text-6xl font-bold text-white leading-[0.95] tracking-tight mb-10'>
          My Runs
        </h1>

        <MyRunsClient upcoming={upcoming} past={past} />
      </section>
    </main>
  )
}
