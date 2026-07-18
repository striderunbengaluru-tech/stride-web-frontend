// Google Calendar "add event" template links — shared by the booking
// confirmation page and the confirmation email.

// Google Calendar template links need UTC timestamps as YYYYMMDDTHHMMSSZ
function gcalDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// Assumed run duration when the admin didn't set an end time
const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000

export function buildGoogleCalendarUrl(opts: {
  eventName: string
  startIso: string
  endIso: string | null
  location: string | null
  description: string
}): string {
  const endIso = opts.endIso
    ?? new Date(new Date(opts.startIso).getTime() + DEFAULT_EVENT_DURATION_MS).toISOString()
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${opts.eventName} — Stride Run Club`,
    dates: `${gcalDate(opts.startIso)}/${gcalDate(endIso)}`,
    details: opts.description,
    ...(opts.location ? { location: opts.location } : {}),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// The standard event description used in calendar entries.
export function calendarDescription(opts: {
  siteUrl: string
  eventSlug: string
  registrationId: string
  runnerTag: string | null
  location: string | null
}): string {
  return [
    'Your run with Stride Run Club 🏃',
    '',
    ...(opts.runnerTag ? [`Stride Tag: ${opts.runnerTag}`] : []),
    ...(opts.location ? [`Where: ${opts.location}`] : []),
    '',
    `Event details & registration: ${opts.siteUrl}/events/${opts.eventSlug}`,
    `Booking confirmation (your ticket): ${opts.siteUrl}/events/${opts.eventSlug}/confirmation/${opts.registrationId}`,
    '',
    'Tip: set this event’s notification to 12 hours before so you’re ready to lace up.',
  ].join('\n')
}
