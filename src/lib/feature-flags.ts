import { notFound } from 'next/navigation'

// True on every non-production deployment (staging branch, feature-branch
// previews, local dev) and false only on the production deployment of the live
// site. `NEXT_PUBLIC_VERCEL_ENV` is injected automatically by Vercel
// ('production' | 'preview' | 'development') and is `undefined` during local
// development.
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
//
// Empty today — `/team` has launched. Annotated `readonly string[]` rather than
// left to `as const` inference: an empty tuple infers `prefix` as `never`, and
// the comparison in `isGatedRoute` then fails to compile.
export const GATED_ROUTE_PREFIXES: readonly string[] = []

// True when `path` is (or is nested under) a route hidden on production.
export function isGatedRoute(path: string): boolean {
  return GATED_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )
}
