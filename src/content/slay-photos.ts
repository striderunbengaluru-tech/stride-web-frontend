import dimensions from './slay-photos.json'

/**
 * Slay Run Club event photos in Supabase Storage.
 *
 * `slay-photos.json` is written by `scripts/optimize-slay-photos.mjs`, which
 * compresses the picks to 1400px WebP and records each file's real size. Typing
 * names off that file means a typo or a photo that was never uploaded fails
 * `yarn build` instead of rendering a broken image.
 */

export type SlayPhotoName = keyof typeof dimensions

export type SlayPhoto = {
  src: string
  width: number
  height: number
  alt: string
}

const SLAY_PHOTO_BASE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/slay'

const SLAY_LOGO_BASE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos'

/**
 * Cache-buster for the logo URLs. Bump it whenever a logo is re-uploaded to an
 * existing path — the edge keeps serving the old bytes at the bare URL.
 */
const LOGO_VERSION = '2'

/** Logos keyed out to transparency by the same script. */
export const SLAY_LOGOS = {
  wordmarkLime: { src: `${SLAY_LOGO_BASE}/slay-wordmark-lime.webp?v=${LOGO_VERSION}`, width: 640, height: 320 },
  wordmarkPink: { src: `${SLAY_LOGO_BASE}/slay-wordmark-pink.webp?v=${LOGO_VERSION}`, width: 640, height: 295 },
  boltLime: { src: `${SLAY_LOGO_BASE}/slay-bolt-lime.webp?v=${LOGO_VERSION}`, width: 640, height: 789 },
  boltPink: { src: `${SLAY_LOGO_BASE}/slay-bolt-pink.webp?v=${LOGO_VERSION}`, width: 640, height: 788 },
} as const

/** The link-preview collage, built by scripts/build-slay-og.mjs. JPEG for scraper support. */
export const SLAY_OG_IMAGE = {
  src: `${SLAY_PHOTO_BASE}/og-join-slay.jpg`,
  width: 2400,
  height: 1260,
  alt: 'Slay Run Club: a collage of women laughing at runs, workshops and a karaoke night, around the Slay logo and "Slay every move."',
} as const

export function slayPhoto(name: SlayPhotoName, alt: string): SlayPhoto {
  const [width, height] = dimensions[name]
  return { src: `${SLAY_PHOTO_BASE}/${name}.webp`, width, height, alt }
}
