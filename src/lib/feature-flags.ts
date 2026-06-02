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

// Single source of truth for the route prefixes that `guardPreviewFeature()`
// hides on production. Used to keep the sitemap from advertising URLs that 404
// on the live site. When a feature launches, remove its `guardPreviewFeature()`
// call AND drop its prefix from this list so it re-enters the production sitemap.
export const GATED_ROUTE_PREFIXES = [
  '/events',
  '/become-a-member',
  '/milestones',
  '/team',
] as const

// True when `path` is (or is nested under) a route hidden on production.
export function isGatedRoute(path: string): boolean {
  return GATED_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )
}
