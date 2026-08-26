'use client'

// A one-shot confetti burst, in the brand palette.
//
// canvas-confetti is imported dynamically inside the fire path rather than at
// module scope: it draws to its own canvas and is only ever wanted after a
// member has redeemed a coupon, so keeping it out of the initial bundle costs
// nothing but a microtask on the one occasion it runs.

/** Brand yellow, brand purple, and a white to keep the burst readable. */
const COLORS = ['#E1D03F', '#4B2862', '#FFFFFF', '#F0E68C']

function prefersReducedMotion(): boolean {
  // Guarded rather than assumed: this runs in a click handler, so `matchMedia`
  // exists, but a browser with the query unimplemented returns undefined.
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/**
 * Fires the burst. Safe to call from anywhere on the client, and safe to ignore
 * the promise — a failure to load a decoration must never surface to a member
 * who has just successfully applied a coupon.
 *
 * Honours `prefers-reduced-motion` by doing nothing at all, matching how every
 * keyframe in globals.css is gated.
 */
export async function fireConfetti(): Promise<void> {
  if (prefersReducedMotion()) return

  try {
    const { default: confetti } = await import('canvas-confetti')

    // Two offset bursts rather than one central spray: a single origin reads as
    // a dropped-in effect, two reads as a celebration around the card.
    const shared = {
      particleCount: 60,
      spread: 70,
      colors: COLORS,
      disableForReducedMotion: true,
      zIndex: 200, // above the modal's z-[100] shell
      scalar: 0.9,
    }

    confetti({ ...shared, origin: { x: 0.3, y: 0.55 }, angle: 60 })
    confetti({ ...shared, origin: { x: 0.7, y: 0.55 }, angle: 120 })
  } catch (err) {
    // Decoration only. Log for the record and move on.
    console.error('[confetti] Could not load the burst', err)
  }
}
