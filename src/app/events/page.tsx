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

      {/* ── Soft ambient orbs — radial gradients with gentle drift ── */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='orb orb-yellow animate-orb-drift top-[-12%] left-[-6%] w-[60rem] h-[60rem]' />
        <div className='orb orb-white  animate-orb-drift-reverse top-[28%] right-[-12%] w-[48rem] h-[48rem]' style={{ animationDelay: '3s' }} />
        <div className='orb orb-yellow animate-orb-drift bottom-[-18%] left-[22%] w-[54rem] h-[54rem]' style={{ animationDelay: '7s' }} />
      </div>

      <section className='relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-24'>

        {/* Header */}
        <div className='mb-12'>
          <p className='text-stride-yellow-accent text-xs font-bold font-mono uppercase tracking-[0.25em] mb-4'>
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
