import { guardPreviewFeature } from '@/lib/feature-flags'

// Events are in internal testing — 404 the whole route group on production.
// Covers /events, /events/[slug] and /events/[slug]/confirmation/[regId].
export default function EventsLayout({ children }: { children: React.ReactNode }) {
  guardPreviewFeature()
  return children
}
