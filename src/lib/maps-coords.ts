// Extract latitude/longitude from a Google Maps URL (the event's meeting-point
// link) so wallet passes can surface on the lock screen near the start point.
// Handles full URLs (@lat,lng · ?q=lat,lng · !3dlat!4dlng) and expands
// maps.app.goo.gl / goo.gl short links by following their redirect.

export type Coords = { latitude: number; longitude: number }

const SHORT_HOSTS = ['maps.app.goo.gl', 'goo.gl', 'g.co']

function parseCoordsFromUrl(url: string): Coords | null {
  // Order matters: !3d…!4d… is the place marker (most precise), then @lat,lng
  // (viewport centre), then q=lat,lng.
  const marker = url.match(/!3d(-?\d+(?:\.\d+))!4d(-?\d+(?:\.\d+))/)
  if (marker) return { latitude: Number(marker[1]), longitude: Number(marker[2]) }

  const at = url.match(/@(-?\d+(?:\.\d+)),(-?\d+(?:\.\d+))/)
  if (at) return { latitude: Number(at[1]), longitude: Number(at[2]) }

  const q = url.match(/[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)),(-?\d+(?:\.\d+))/)
  if (q) return { latitude: Number(q[1]), longitude: Number(q[2]) }

  return null
}

export async function coordsFromMapsUrl(rawUrl: string | null | undefined): Promise<Coords | null> {
  if (!rawUrl) return null

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  const direct = parseCoordsFromUrl(rawUrl)
  if (direct) return direct

  // Short link — follow the redirect chain to the full maps URL
  if (SHORT_HOSTS.some(h => url.hostname === h || url.hostname.endsWith(`.${h}`))) {
    try {
      const res = await fetch(rawUrl, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(5000) })
      return parseCoordsFromUrl(res.url)
    } catch {
      return null
    }
  }

  return null
}
