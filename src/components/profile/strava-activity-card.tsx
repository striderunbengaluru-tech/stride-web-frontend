import { ExternalLink } from 'lucide-react'
import { StravaIcon } from '@/components/ui/brand-icons'
import { decodePolyline, routeToSvg, type MapTile } from '@/lib/strava/polyline'
import type { StravaActivitySummary } from '@/types/strava'

// One synced run. Server component: the route is projected onto basemap tiles
// on the server, so the browser gets a finished drawing and no JavaScript.

const MAP_WIDTH = 320
const MAP_HEIGHT = 180
const MAP_PADDING = 24
const SECONDS_PER_HOUR = 3600
const METRES_PER_KM = 1000

// The run's own local wall-clock time: start_date shifted by the run's UTC
// offset, then formatted *as* UTC so no second timezone gets applied.
const localStartFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

function formatLocalStart(activity: StravaActivitySummary): string {
  const localMs = new Date(activity.startDate).getTime() + activity.utcOffsetS * 1000
  return localStartFormatter.format(new Date(localMs))
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR)
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

function formatPace(movingTimeS: number, distanceM: number): string {
  if (distanceM <= 0) return '—'
  const secondsPerKm = Math.round(movingTimeS / (distanceM / METRES_PER_KM))
  return `${formatDuration(secondsPerKm)} /km`
}

/**
 * OpenStreetMap's standard tiles — free with attribution and no API key, which
 * suits a handful of small maps per profile.
 */
function tileUrl(tile: MapTile): string {
  return `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`
}

// Tiles scaled to a fractional zoom can leave hairline seams; a sliver of
// overlap hides them.
const TILE_OVERLAP = 0.5

const FLAG_CELL = 3
const FLAG_COLS = 4
const FLAG_ROWS = 3
const FLAG_POLE = 18

/** A black-and-white chequered flag whose pole stands on the finish point. */
function FinishFlag({ x, y }: { x: number; y: number }) {
  const top = y - FLAG_POLE
  const cells = Array.from({ length: FLAG_COLS * FLAG_ROWS }, (_, i) => ({ col: i % FLAG_COLS, row: Math.floor(i / FLAG_COLS) }))
  return (
    <g>
      {/* White backing so the flag reads on any street colour */}
      <rect x={x - 1} y={top - 1} width={FLAG_COLS * FLAG_CELL + 2} height={FLAG_ROWS * FLAG_CELL + 2} className='fill-white' />
      {cells.map(({ col, row }) => (
        <rect
          key={`${col}-${row}`}
          x={x + col * FLAG_CELL}
          y={top + row * FLAG_CELL}
          width={FLAG_CELL}
          height={FLAG_CELL}
          className={(col + row) % 2 === 0 ? 'fill-black' : 'fill-white'}
        />
      ))}
      <line x1={x} y1={top} x2={x} y2={y} strokeWidth={1.5} strokeLinecap='round' className='stroke-black' />
      <circle cx={x} cy={y} r={2} className='fill-black stroke-white' strokeWidth={1} />
    </g>
  )
}

function RouteMap({ activity }: { activity: StravaActivitySummary }) {
  const route = activity.summaryPolyline
    ? routeToSvg(decodePolyline(activity.summaryPolyline), MAP_WIDTH, MAP_HEIGHT, MAP_PADDING)
    : null

  if (!route) {
    return (
      <div className='flex aspect-16/9 items-center justify-center bg-black/25 font-mono text-xs font-medium uppercase tracking-widest text-white/40'>
        {activity.sportType === 'VirtualRun' ? 'Virtual run' : 'Indoor run'}
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className='block aspect-16/9 w-full bg-neutral-200'
      role='img'
      aria-label={`Route map of ${activity.name}`}
    >
      {route.tiles.map(tile => (
        <image
          key={`${tile.z}/${tile.x}/${tile.y}/${tile.left}`}
          href={tileUrl(tile)}
          x={tile.left}
          y={tile.top}
          width={tile.size + TILE_OVERLAP}
          height={tile.size + TILE_OVERLAP}
          preserveAspectRatio='none'
        />
      ))}
      {/* Dark casing keeps the yellow line legible over pale streets, then the line itself */}
      <path d={route.d} fill='none' strokeLinecap='round' strokeLinejoin='round' strokeWidth={7} className='stroke-stride-purple-primary/80' />
      <path d={route.d} fill='none' strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} className='stroke-stride-yellow-accent' />
      <FinishFlag x={route.end.x} y={route.end.y} />
      {/* Start drawn last so it stays visible on loops that finish where they began */}
      <circle cx={route.start.x} cy={route.start.y} r={5} className='fill-emerald-500 stroke-white' strokeWidth={2} />
    </svg>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className='min-w-0'>
      <dt className='font-mono text-[10px] uppercase tracking-widest text-white/50'>{label}</dt>
      <dd className='line-clamp-1 font-mono text-sm font-semibold tabular-nums text-white'>{value}</dd>
    </div>
  )
}

export function StravaActivityCard({ activity }: { activity: StravaActivitySummary }) {
  return (
    <article className='flex flex-col overflow-hidden rounded-xl border border-white/15 bg-white/10 backdrop-blur-md transition-colors hover:border-stride-yellow-accent/50'>
      <RouteMap activity={activity} />

      <div className='flex flex-1 flex-col gap-3 p-4'>
        <div className='flex items-start justify-between gap-3'>
          <p className='flex items-baseline gap-1 font-mono tabular-nums'>
            <span className='text-3xl font-bold leading-none text-white'>{(activity.distanceM / METRES_PER_KM).toFixed(2)}</span>
            <span className='text-sm font-medium text-white/70'>km</span>
          </p>
          <p className='shrink-0 rounded-md bg-white/10 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-widest text-white/80'>
            {formatLocalStart(activity)}
          </p>
        </div>

        <h3 className='line-clamp-1 text-sm font-semibold text-white'>{activity.name}</h3>

        <dl className='grid grid-cols-3 gap-3 border-t border-white/10 pt-3'>
          <Stat label='Pace' value={formatPace(activity.movingTimeS, activity.distanceM)} />
          <Stat label='Time' value={formatDuration(activity.movingTimeS)} />
          <Stat label='Elev' value={`${Math.round(activity.elevationGainM)} m`} />
        </dl>

        {/* Strava's brand guidelines ask for a link back to the activity */}
        <div className='-mb-2 mt-auto'>
          <a
            href={`https://www.strava.com/activities/${activity.id}`}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline'
          >
            <StravaIcon size={12} className='text-strava-orange' />
            View on Strava
            <ExternalLink size={12} aria-hidden='true' />
            <span className='sr-only'>(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </article>
  )
}
