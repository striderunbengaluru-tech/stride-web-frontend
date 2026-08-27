'use client'

import { markNotFoundRoute } from '@/lib/auth/refresh-guard'

/**
 * Tells the rest of the client bundle that this render is a 404.
 *
 * Renders nothing. It exists so `AuthProvider` can refuse to call
 * `router.refresh()` here: the RSC payload for a not-found route answers HTTP
 * 404, which the App Router cannot apply, so it falls back to a full document
 * reload — and that reload remounts the provider and fires the same auth event
 * again. See @/lib/auth/refresh-guard for the full chain.
 *
 * The flag is set in the render body rather than an effect on purpose. Auth
 * events arrive asynchronously, well after the first render, so setting it here
 * guarantees it is already true by the time any handler could read it — where an
 * effect would race the initial `getSession()` resolution.
 */
export function NotFoundMarker() {
  markNotFoundRoute()
  return null
}
