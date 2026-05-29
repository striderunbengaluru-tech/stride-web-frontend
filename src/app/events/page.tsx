import type { Metadata } from 'next'
import { adminClient } from '@/lib/supabase/admin'
import { EventsClient } from '@/components/events/events-client'

export const metadata: Metadata = {
  title: 'Events — Stride Run Club',
  description: 'Races, group runs, and community meetups — all in one place.',
}

export default async function EventsPage() {
  const { data: allEvents } = await adminClient
    .from('events')
    .select('id, name, subtitle, slug, event_date, location, price_paise, cover_url, banner_images')
    .eq('status', 'PUBLISHED')
    .order('event_date', { ascending: true })

  const events = (allEvents ?? []).map(event => {
    let imageUrl: string | null = event.cover_url ?? null
    if (event.banner_images) {
      try {
        const arr = JSON.parse(event.banner_images) as string[]
        if (arr[0]) imageUrl = arr[0]
      } catch { /* keep cover_url fallback */ }
    }
    return { ...event, imageUrl }
  })

  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-hidden'>

      {/* ── Soft ambient orbs ── */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute top-[-10%] left-[-5%] w-[55rem] h-[55rem] rounded-full bg-stride-yellow-accent/[0.055] blur-[140px] animate-pulse-orb' />
        <div className='absolute top-[30%] right-[-10%] w-[45rem] h-[45rem] rounded-full bg-white/[0.03] blur-[130px]' style={{ animationDelay: '1.5s' }} />
        <div className='absolute bottom-[-15%] left-[25%] w-[50rem] h-[50rem] rounded-full bg-stride-yellow-accent/[0.03] blur-[160px] animate-pulse-orb' style={{ animationDelay: '3s' }} />
      </div>

      <section className='relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-24'>

        {/* Header */}
        <div className='mb-12'>
          <p className='text-stride-yellow-accent text-xs font-bold uppercase tracking-[0.25em] mb-4'>
            Stride Run Club · Bengaluru
          </p>
          <h1 className='text-6xl sm:text-7xl font-bold text-white leading-[0.95] tracking-tight'>
            Events
          </h1>
          <p className='text-white/45 text-lg mt-5 max-w-md leading-relaxed'>
            Group runs, races, and community meetups — show up and earn your stripes.
          </p>
        </div>

        <EventsClient events={events} />
      </section>
    </main>
  )
}
