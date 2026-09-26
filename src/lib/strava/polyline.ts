// Turns a Strava `summary_polyline` into an SVG path plus the basemap tiles
// behind it, so a run's route can be drawn on real streets with no map
// library. Pure functions — run on the server, so the browser only receives
// the finished path and a handful of tile URLs.

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

/** One basemap tile, placed in the same box coordinates as the route. */
export type MapTile = { z: number; x: number; y: number; left: number; top: number; size: number }

export type RouteShape = {
  d: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  /** The basemap tiles that cover the box, positioned so the route sits on its streets. */
  tiles: MapTile[]
}

const TILE_PX = 256
/** Closest the map zooms — street level. A short run still gets its neighbourhood around it. */
const MAX_ZOOM = 16
/** Latitude limit of the Web Mercator projection, which every tile server uses. */
const MAX_MERCATOR_LAT = 85.0511

/** Web Mercator at zoom 0: the whole world is one 256 × 256 tile. */
function toWorld([lat, lng]: LatLng): { x: number; y: number } {
  const clampedLat = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat))
  const sin = Math.sin((clampedLat * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * TILE_PX,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * TILE_PX,
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** The tiles at zoom `z` that cover a `width` × `height` box whose top-left is (`left`, `top`) in world pixels. */
function coveringTiles(z: number, tileSize: number, left: number, top: number, width: number, height: number): MapTile[] {
  const tilesPerSide = 2 ** z
  const tiles: MapTile[] = []
  for (let ty = Math.floor(top / tileSize); ty <= Math.floor((top + height) / tileSize); ty++) {
    if (ty < 0 || ty >= tilesPerSide) continue
    for (let tx = Math.floor(left / tileSize); tx <= Math.floor((left + width) / tileSize); tx++) {
      tiles.push({
        z,
        x: ((tx % tilesPerSide) + tilesPerSide) % tilesPerSide, // wraps across the antimeridian
        y: ty,
        left: round1(tx * tileSize - left),
        top: round1(ty * tileSize - top),
        size: round1(tileSize),
      })
    }
  }
  return tiles
}

/**
 * Fits the route into a `width` × `height` box (minus `padding`) in Web
 * Mercator — the projection map tiles use — and lists the tiles that sit
 * behind it. The zoom is fractional so the route fills the box; tiles are
 * fetched at the zoom level below and scaled up to match. Returns null when
 * there aren't enough points to draw a line.
 */
export function routeToSvg(points: LatLng[], width: number, height: number, padding: number): RouteShape | null {
  if (points.length < 2) return null

  const world = points.map(toWorld)
  const xs = world.map(p => p.x)
  const ys = world.map(p => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const spanX = Math.max(...xs) - minX
  const spanY = Math.max(...ys) - minY
  if (spanX === 0 && spanY === 0) return null

  // Pixels per zoom-0 pixel, i.e. 2^zoom. A zero span on one axis (a dead
  // straight out-and-back) just doesn't constrain that axis.
  const fitX = spanX > 0 ? (width - padding * 2) / spanX : Infinity
  const fitY = spanY > 0 ? (height - padding * 2) / spanY : Infinity
  const scale = Math.min(fitX, fitY, 2 ** MAX_ZOOM)
  const tileZoom = Math.floor(Math.log2(scale))

  const left = (minX + spanX / 2) * scale - width / 2
  const top = (minY + spanY / 2) * scale - height / 2
  const toBox = (p: { x: number; y: number }) => ({ x: round1(p.x * scale - left), y: round1(p.y * scale - top) })

  const boxed = world.map(toBox)
  const d = boxed.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join('')
  const tileSize = TILE_PX * (scale / 2 ** tileZoom)
  return {
    d,
    start: boxed[0],
    end: boxed[boxed.length - 1],
    tiles: coveringTiles(tileZoom, tileSize, left, top, width, height),
  }
}
