// Turns a Strava `summary_polyline` into an SVG path, so a run's route can be
// drawn with no map library and no tile requests. Pure functions — run on the
// server, so the browser only receives the finished path string.

export type LatLng = [lat: number, lng: number]

/** Decodes Google's encoded polyline format (precision 5), which Strava uses. */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = []
  let index = 0
  let lat = 0
  let lng = 0

  const nextDelta = (): number | null => {
    let result = 0
    let shift = 0
    let byte: number
    do {
      if (index >= encoded.length) return null
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    return result & 1 ? ~(result >> 1) : result >> 1
  }

  while (index < encoded.length) {
    const dLat = nextDelta()
    const dLng = nextDelta()
    if (dLat === null || dLng === null) break // truncated input: keep what decoded cleanly
    lat += dLat
    lng += dLng
    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

export type RouteShape = {
  d: string
  start: { x: number; y: number }
  end: { x: number; y: number }
}

/**
 * Fits the route into a `width` × `height` box (minus `padding`), keeping its
 * true proportions. Longitude is scaled by cos(latitude) — an equirectangular
 * projection, which is accurate at the scale of a single run. Returns null when
 * there aren't enough points to draw a line.
 */
export function routeToSvg(points: LatLng[], width: number, height: number, padding: number): RouteShape | null {
  if (points.length < 2) return null

  const meanLat = points.reduce((sum, [lat]) => sum + lat, 0) / points.length
  const lngScale = Math.cos((meanLat * Math.PI) / 180)
  const projected = points.map(([lat, lng]) => ({ x: lng * lngScale, y: -lat }))

  const xs = projected.map(p => p.x)
  const ys = projected.map(p => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const spanX = Math.max(...xs) - minX
  const spanY = Math.max(...ys) - minY
  if (spanX === 0 && spanY === 0) return null

  const innerW = width - padding * 2
  const innerH = height - padding * 2
  const scale = Math.min(innerW / (spanX || spanY), innerH / (spanY || spanX))
  const offsetX = padding + (innerW - spanX * scale) / 2
  const offsetY = padding + (innerH - spanY * scale) / 2

  const toBox = (p: { x: number; y: number }) => ({
    x: Math.round((offsetX + (p.x - minX) * scale) * 10) / 10,
    y: Math.round((offsetY + (p.y - minY) * scale) * 10) / 10,
  })

  const boxed = projected.map(toBox)
  const d = boxed.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join('')
  return { d, start: boxed[0], end: boxed[boxed.length - 1] }
}
