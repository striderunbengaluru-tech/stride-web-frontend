// Client-side auth caches, written by AuthProvider so the navbar can render a
// signed-in visitor without a network round trip.
//
// They must be cleared on sign-out AND on account deletion. A surviving
// `_stride_nav_profile:<id>` entry is what let a just-deleted account keep
// showing its own name and avatar in the navbar: the server erased the row, but
// this tab kept rendering from its cache.

export const AUTHED_KEY = '_stride_authed'
export const NAV_PROFILE_KEY = '_stride_nav_profile'

/** Removes the sign-in marker and every cached nav profile. */
export function clearAuthCaches(): void {
  try {
    sessionStorage.removeItem(AUTHED_KEY)
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(NAV_PROFILE_KEY)) sessionStorage.removeItem(key)
    }
  } catch {
    // sessionStorage unavailable (private mode, disabled storage) — nothing to clear
  }
}
