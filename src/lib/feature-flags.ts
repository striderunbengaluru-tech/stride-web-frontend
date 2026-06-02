import { notFound } from 'next/navigation'

// Events, Become-a-Member and Milestones are still in internal testing.
// Shown on every non-production deployment (staging branch, feature-branch
// previews, local dev) and hidden — returning 404 — only on the production
// deployment of the live site. `NEXT_PUBLIC_VERCEL_ENV` is injected
// automatically by Vercel ('production' | 'preview' | 'development') and is
// `undefined` during local development.
export const PREVIEW_FEATURES_ENABLED =
  process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production'

// Call as the first line of a Server Component to 404 the route on production.
export function guardPreviewFeature(): void {
  if (!PREVIEW_FEATURES_ENABLED) notFound()
}
