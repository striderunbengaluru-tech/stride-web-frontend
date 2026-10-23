// A save action finishes with redirect(), which unmounts the form before it
// could toast. So the action appends one of these keys to the URL it redirects
// to, and <AdminSaveToast /> in the admin layout turns it into the toast.
// Allowlisted: the URL only ever selects a message, never supplies one.

export const SAVE_NOTICE_PARAM = 'saved'

export const SAVE_NOTICES = {
  'event-created': 'Event created',
  'event-updated': 'Event changes saved',
  'race-created': 'Race created',
  'race-updated': 'Race changes saved',
} as const

export type SaveNotice = keyof typeof SAVE_NOTICES

export function isSaveNotice(value: string | null): value is SaveNotice {
  return value !== null && Object.hasOwn(SAVE_NOTICES, value)
}

/** `path` with the notice appended, for the action's redirect. */
export function withSaveNotice(path: string, notice: SaveNotice): string {
  return `${path}?${SAVE_NOTICE_PARAM}=${notice}`
}
