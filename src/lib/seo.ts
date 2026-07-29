// Shared SEO constants.
//
// Page metadata should use *relative* paths for `alternates.canonical` and
// `openGraph.url` — the root layout sets `metadataBase`, so Next resolves them
// against the live origin and they stay correct on staging and locally.

/**
 * Fallback social preview image, used by pages without artwork of their own.
 * 1200×630, the size every major share target crops to.
 */
export const DEFAULT_OG_IMAGE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/homepage-og.png'

export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630
