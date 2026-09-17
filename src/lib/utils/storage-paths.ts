import { z } from 'zod'

/**
 * The one place that knows where admin-uploaded images live in the
 * `stride-assets` bucket. The upload route files under a prefix, the delete
 * route and the delete actions refuse anything outside one — so a request can
 * never name a path under images/avatars/ and have an admin endpoint remove it.
 */
export const STORAGE_PUBLIC_BASE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/'

export const IMAGE_KINDS = {
  event: 'images/events/',
  race: 'images/races/',
} as const

export type ImageKind = keyof typeof IMAGE_KINDS

/** Defaults to 'event' so the existing event form, which sends no kind, is unchanged. */
export const imageKindSchema = z.enum(['event', 'race']).default('event')

/** Bucket-relative path for one of our public URLs, or null when the URL is not ours. */
export function storagePathFromPublicUrl(url: string): string | null {
  return url.startsWith(STORAGE_PUBLIC_BASE) ? url.slice(STORAGE_PUBLIC_BASE.length) : null
}

/** True when the path sits under a prefix admins are allowed to manage. */
export function isAllowedImagePath(path: string): boolean {
  return Object.values(IMAGE_KINDS).some(prefix => path.startsWith(prefix))
}

/**
 * Bucket-relative paths for the URLs under exactly one prefix — what a delete
 * action passes to storage.remove(). URLs that are not ours or sit elsewhere are
 * dropped, not errored: a race row must never be able to delete an event image.
 */
export function storagePathsUnder(kind: ImageKind, urls: readonly string[]): string[] {
  const prefix = IMAGE_KINDS[kind]
  return urls
    .map(storagePathFromPublicUrl)
    .filter((path): path is string => path !== null && path.startsWith(prefix))
}
