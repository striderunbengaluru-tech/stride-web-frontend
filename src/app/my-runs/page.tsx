import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { MyRunsClient, type MyRun } from '@/components/profile/my-runs-client'
import { TrackBackdrop } from '@/components/ui/track-backdrop'

export const metadata: Metadata = {
  title: 'My Runs — Stride Run Club',
  description: 'Your upcoming registrations and the runs you’ve checked in to.',
}

type RegRow = {
  id: string
  event_id: string
  status: string | null
  checked_in_at: string | null
  /** Captured by Razorpay. Null for free registrations. */
  amount_paid_paise: number | null
  /** What this registration owed — the package sum, when packages were used. */
  amount_due_paise: number | null
}

type EventRow = {
  id: string
  name: string
  slug: string
  event_date: string | null
  location: string | null
  banner_images: string | null
  price_paise: number | null
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/become-a-member')

  // Fetch the member's registrations, then the events separately and join in
  // JS. We deliberately avoid a PostgREST `events(...)` embed because it relies
  // on the event_id → events foreign key being present, which can't be assumed.
  const { data: regData } = await adminClient
    .from('event_registrations')
    .select('id, event_id, status, checked_in_at, amount_paid_paise, amount_due_paise')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const regs = (regData ?? []) as RegRow[]
  const eventIds = [...new Set(regs.map(r => r.event_id).filter(Boolean))]

  const { data: eventData } = eventIds.length
    ? await adminClient
        .from('events')
        .select('id, name, slug, event_date, location, banner_images, price_paise')
        .in('id', eventIds)
    : { data: [] as EventRow[] }

  const eventsById = new Map((eventData ?? []).map(e => [e.id, e as EventRow]))
  const now = new Date()

  const toRun = (r: RegRow, e: EventRow): MyRun => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    eventDate: e.event_date,
    location: e.location,
    bannerUrl: firstBanner(e.banner_images),
    // The card labels this "paid", so it has to be what THIS registration cost,
    // not the event's list price — with packages the two differ, and
    // events.price_paise is ignored entirely.
    pricePaise: r.amount_paid_paise ?? r.amount_due_paise ?? e.price_paise ?? 0,
    checkedIn: !!r.checked_in_at,
    // Rows link to the booking confirmation (the member's receipt) — only
    // confirmed registrations have one, others fall back to the event page.
    confirmationRegId: r.status === 'CONFIRMED' ? r.id : null,
  })

  // Pair each registration with its event (dropping any orphaned rows).
  const paired = regs
    .map(r => ({ reg: r, event: eventsById.get(r.event_id) }))
    .filter((p): p is { reg: RegRow; event: EventRow } => !!p.event)

  // Upcoming = active (non-cancelled) registration for an event still ahead.
  const upcoming: MyRun[] = paired
    .filter(({ reg }) => reg.status !== 'CANCELLED')
    .filter(({ event }) => event.event_date && new Date(event.event_date) >= now)
    .map(({ reg, event }) => toRun(reg, event))
    .sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? ''))

  // Past = runs the member actually checked in to.
  const past: MyRun[] = paired
    .filter(({ reg }) => reg.checked_in_at)
    .map(({ reg, event }) => toRun(reg, event))
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''))

  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-hidden'>
      {/* Run-club backdrop — track lanes, route line, grain (same as events pages) */}
      <TrackBackdrop />

      <section className='relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-24'>
        <h1 className='text-5xl sm:text-6xl font-bold text-white leading-[0.95] tracking-tight'>
          My Runs
        </h1>
        <p className='text-white/50 text-base mt-4 mb-10 max-w-xl leading-relaxed'>
          Every run you&apos;ve signed up for with Stride, in one place. Tap a run
          to open its booking confirmation.
        </p>

        <MyRunsClient upcoming={upcoming} past={past} />
      </section>
    </main>
  )
}
