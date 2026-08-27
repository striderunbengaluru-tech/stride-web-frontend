/**
 * Guards against `router.refresh()` being called when it cannot succeed, or
 * when nothing has actually changed.
 *
 * ## Why this exists
 *
 * Signed-in visitors who landed on a 404 saw the page reload over and over.
 * The loop:
 *
 *  1. `AuthProvider` sits in the root layout, so it runs on the 404 page too.
 *  2. It called `router.refresh()` on every `SIGNED_IN` / `USER_UPDATED` event.
 *     supabase-js emits `SIGNED_IN` from eleven different call sites, several of
 *     which fire during ordinary initialisation and token recovery — not only
 *     on a genuine new sign-in. So a plain page load refreshed the router.
 *  3. `router.refresh()` refetches the route's RSC payload. On a not-found
 *     route that response carries **HTTP 404**, and the App Router cannot apply
 *     a non-OK RSC payload, so it escalates to a full document reload.
 *  4. The reload remounts `AuthProvider`, which re-initialises supabase-js,
 *     which emits the event again. Back to step 2, forever.
 *
 * Only 404s looped, because only there does the RSC refetch return a status the
 * router has to hard-reload out of. On a valid route the same needless refresh
 * happened silently, which is its own small waste.
 *
 * ## Two independent guards
 *
 * `shouldRefreshForAuthChange` is the root-cause fix: refresh only when the
 * signed-in identity genuinely changed. `isOnNotFoundRoute` is the backstop, so
 * that even a legitimate refresh is not attempted on the one route where it
 * provably cannot be applied. Either alone breaks the loop; both together mean
 * a future caller has to get two things wrong to bring it back.
 */

/** The last identity a refresh was evaluated against. `null` = signed out. */
let lastIdentity: string | null | undefined = undefined

/**
 * True when this auth event represents a real change of signed-in identity.
 *
 * Called with the user id for a signed-in state, or `null` for signed out. The
 * first call after load establishes the baseline and returns false: arriving on
 * a page already signed in is not a transition, and the server render the
 * visitor is looking at was produced with that same session.
 */
export function shouldRefreshForAuthChange(userId: string | null): boolean {
  const first = lastIdentity === undefined
  const changed = !first && lastIdentity !== userId
  lastIdentity = userId
  return changed
}

/** Resets the baseline. Exported for tests and for a deliberate hard sign-out. */
export function resetAuthRefreshGuard(): void {
  lastIdentity = undefined
}

/**
 * Marks the current render as a not-found render.
 *
 * Set from the render body of a client marker inside `not-found.tsx`, so it is
 * true before any asynchronous auth event can fire. Module scope rather than
 * context because the only reader is an event handler, which has no access to
 * the React tree by then.
 */
let onNotFoundRoute = false

export function markNotFoundRoute(): void {
  onNotFoundRoute = true
}

export function isOnNotFoundRoute(): boolean {
  return onNotFoundRoute
}
