import { getPublishedEvents, type EventListRow } from '@/lib/data/events'
import { UpNextBanner, type UpNextEvent } from '@/components/events/up-next-banner'
import { eventRowPriceLabel } from '@/lib/utils/money'

// Kept out of the component body: reading the clock during render trips
// react-hooks/purity, and the selection is easier to reason about on its own.
// Rows arrive date-ascending, so the first future one is the soonest.
function findUpNext(events: EventListRow[]): EventListRow | undefined {
  const now = Date.now()
  return events.find(e => e.event_date && new Date(e.event_date).getTime() >= now)
}

// Homepage "Up next" slot. Reads from the same tagged, revalidating cache the
// events pages use, so it adds no per-request DB work and the homepage stays
// statically generated (refreshed by revalidateTag('events') on admin writes).
//
// Renders nothing at all — no heading, no empty state — when there's no
// upcoming run, so the homepage closes up cleanly between events.
export async function UpNextSection() {
  const events = await getPublishedEvents()

  const next = findUpNext(events)
  if (!next) return null

  let imageUrl: string | null = next.cover_url ?? null
  if (next.banner_images) {
    try {
      const arr = JSON.parse(next.banner_images) as string[]
      if (arr[0]) imageUrl = arr[0]
    } catch { /* keep cover_url fallback */ }
  }

  const event: UpNextEvent = {
    name: next.name,
    subtitle: next.subtitle,
    slug: next.slug,
    event_date: next.event_date,
    location: next.location,
    price_paise: next.price_paise,
    imageUrl,
    priceLabel: eventRowPriceLabel(next.price_paise, next.packages, next.packages_enabled),
  }

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

      <UpNextBanner event={event} showLabel={false} />
    </section>
  )
}
