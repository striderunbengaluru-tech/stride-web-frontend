import data from './lead-striders.json'

/**
 * A core team lead — a "Lead Strider" — as shown on `/team`.
 *
 * Content lives in `lead-striders.json`; this module types it. The plain
 * assignment below (no `as` cast) is what makes the JSON compile-time checked
 * against this type, so a typo or a missing field fails `yarn build` rather
 * than rendering a blank card.
 */
export type LeadStrider = {
  /** URL-safe id. Doubles as the React key and the `#anchor` on the page. */
  slug: string
  name: string
  /**
   * Job title, e.g. 'Founder & Head Pacer'. Rendered on one line. Empty string
   * omits it from the card AND from the `Person.jobTitle` in the page's
   * JSON-LD — these describe real people, so a blank is correct until the real
   * title is known. Never fill it with a guess.
   */
  role: string
  /** One line, ~90 characters. Clamped to two lines. Empty string omits it. */
  bio: string
  /** Empty string hides the link — not every strider is on both networks. */
  instagramUrl: string
  /** Empty string hides the link. */
  stravaUrl: string
  /**
   * Filenames under `TEAM_IMAGE_BASE`, in display order. `images[0]` MUST be
   * the hand-folded + smile shot: it is the card's resting frame, the first
   * frame of the pose cycle, and the `Person.image` in the page's JSON-LD.
   * The rest are the signature poses. Two or three entries both work.
   */
  images: string[]
}

/**
 * Supabase Storage folder holding the cut-out portraits with their backgrounds
 * already composited in. The hostname is allowed in `next.config.ts`
 * `remotePatterns`, so these are safe to pass to `next/image`.
 */
export const TEAM_IMAGE_BASE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/team'

/**
 * Cache-buster for the portrait URLs. **Bump this whenever a portrait is
 * re-uploaded to an existing path.**
 *
 * Re-uploading replaces the object, but the bare URL keeps serving the old
 * bytes from an edge cache — verified: after replacing `kushagra-pose-1.webp`,
 * the plain URL still returned the previous 47 KB file while the same URL with a
 * query string returned the new 41 KB one. Next's image optimizer also keys its
 * own 31-day cache on the source URL, so without this the stale copy survives a
 * deploy.
 *
 * A single shared version re-fetches all portraits rather than just the changed
 * one. That is deliberate — they total ~320 KB, and one knob cannot be forgotten
 * the way eight per-file versions can.
 */
const ASSET_VERSION = '3'

export const LEAD_STRIDERS: LeadStrider[] = data

/** Absolute URLs for one strider's poses, in display order. */
export function striderImageUrls(strider: LeadStrider): string[] {
  return strider.images.map(
    (file) => `${TEAM_IMAGE_BASE}/${file}?v=${ASSET_VERSION}`
  )
}
