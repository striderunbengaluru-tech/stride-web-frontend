import { getPublishedEvents, type EventListRow } from '@/lib/data/events'
import { type UpNextEvent } from '@/components/events/up-next-banner'
import { UpNextCarousel } from '@/components/events/up-next-carousel'
import { eventRowPriceLabel } from '@/lib/utils/money'

// Kept out of the component body: reading the clock during render trips
// react-hooks/purity, and the selection is easier to reason about on its own.
// Rows arrive date-ascending, so this stays soonest-first.
function findUpcoming(events: EventListRow[]): EventListRow[] {
  const now = Date.now()
  return events.filter(e => e.event_date && new Date(e.event_date).getTime() >= now)
}

function toUpNextEvent(row: EventListRow): UpNextEvent {
  let imageUrl: string | null = row.cover_url ?? null
  if (row.banner_images) {
    try {
      const arr = JSON.parse(row.banner_images) as string[]
      if (arr[0]) imageUrl = arr[0]
    } catch { /* keep cover_url fallback */ }
  }

  return {
    name: row.name,
    subtitle: row.subtitle,
    slug: row.slug,
    event_date: row.event_date,
    location: row.location,
    price_paise: row.price_paise,
    imageUrl,
    invite_only: row.invite_only,
    priceLabel: eventRowPriceLabel(row.price_paise, row.packages, row.packages_enabled),
  }
}

// Homepage "Up next" slot. Reads from the same tagged, revalidating cache the
// events pages use, so it adds no per-request DB work and the homepage stays
// statically generated (refreshed by revalidateTag('events') on admin writes).
//
// Renders nothing at all — no heading, no empty state — when there's no
// upcoming run, so the homepage closes up cleanly between events.
export async function UpNextSection() {
  const events = await getPublishedEvents()

  const upcoming = findUpcoming(events).map(toUpNextEvent)
  if (upcoming.length === 0) return null

  return (
    <section className='max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-10 md:pt-12 md:pb-16'>
      {/* Section heading carries the eyebrow, so the card hides its own.
          Type scale and spacing match the Press & Media heading exactly. */}
      <div className='mb-8 md:mb-12'>
        <p className='text-stride-yellow-accent text-xs font-medium tracking-widest font-mono uppercase mb-4'>
          Up next
        </p>
        <h2 className='font-libre text-4xl md:text-5xl font-bold text-copy-white leading-tight'>
          Join our next event
        </h2>
      </div>

      <UpNextCarousel events={upcoming} showLabel={false} />
    </section>
  )
}
