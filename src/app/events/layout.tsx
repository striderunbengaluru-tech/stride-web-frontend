import { PREVIEW_FEATURES_ENABLED } from '@/lib/feature-flags'
import { ComingSoon } from '@/components/ui/coming-soon'

// Events are in internal testing. On the production site we show a "Coming
// soon" placeholder (instead of a hard 404) so visitors know the feature is on
// its way. On staging / previews / local dev the full feature renders.
// Covers /events, /events/[slug] and /events/[slug]/confirmation/[regId].
export default function EventsLayout({ children }: { children: React.ReactNode }) {
  if (!PREVIEW_FEATURES_ENABLED) {
    return (
      <ComingSoon
        label='Events'
        description='Our events calendar and race registration are almost ready. Check back soon to run with us.'
      />
    )
  }
  return children
}
