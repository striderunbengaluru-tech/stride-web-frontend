import { ExternalLink } from 'lucide-react'
import { StravaIcon } from '@/components/ui/brand-icons'
import { decodePolyline, routeToSvg } from '@/lib/strava/polyline'
import type { StravaActivitySummary } from '@/types/strava'

// One synced run. Server component: the route is projected to an SVG path on
// the server, so the browser gets a finished drawing and no JavaScript.

const MAP_WIDTH = 320
const MAP_HEIGHT = 180
const MAP_PADDING = 16
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

function RouteTrace({ activity }: { activity: StravaActivitySummary }) {
  const route = activity.summaryPolyline
    ? routeToSvg(decodePolyline(activity.summaryPolyline), MAP_WIDTH, MAP_HEIGHT, MAP_PADDING)
    : null

  if (!route) {
    return (
      <div className='flex aspect-16/9 items-center justify-center rounded-lg bg-black/20 text-xs font-medium uppercase tracking-widest text-white/40'>
        {activity.sportType === 'VirtualRun' ? 'Virtual run' : 'Indoor run'}
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className='aspect-16/9 w-full rounded-lg bg-black/20'
      role='img'
      aria-label={`Route map of ${activity.name}`}
    >
      {/* Soft glow under the line, then the line itself */}
      <path d={route.d} fill='none' strokeLinecap='round' strokeLinejoin='round' strokeWidth={8} className='stroke-stride-yellow-accent/20' />
      <path d={route.d} fill='none' strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} className='stroke-stride-yellow-accent' />
      <circle cx={route.start.x} cy={route.start.y} r={5} className='fill-emerald-400 stroke-stride-purple-primary' strokeWidth={2} />
      <circle cx={route.end.x} cy={route.end.y} r={5} className='fill-white stroke-stride-purple-primary' strokeWidth={2} />
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
    <article className='flex flex-col gap-3 rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md transition-colors hover:border-stride-yellow-accent/50'>
      <RouteTrace activity={activity} />

      <div className='min-w-0 px-1'>
        <h3 className='line-clamp-1 text-sm font-semibold text-white'>{activity.name}</h3>
        <p className='text-xs text-white/60'>{formatLocalStart(activity)}</p>
      </div>

      <dl className='grid grid-cols-2 gap-x-3 gap-y-2 px-1'>
        <Stat label='Distance' value={`${(activity.distanceM / METRES_PER_KM).toFixed(2)} km`} />
        <Stat label='Pace' value={formatPace(activity.movingTimeS, activity.distanceM)} />
        <Stat label='Time' value={formatDuration(activity.movingTimeS)} />
        <Stat label='Elevation' value={`${Math.round(activity.elevationGainM)} m`} />
      </dl>

      {/* Strava's brand guidelines ask for a link back to the activity */}
      <a
        href={`https://www.strava.com/activities/${activity.id}`}
        target='_blank'
        rel='noopener noreferrer'
        className='mt-auto inline-flex min-h-11 items-center gap-1.5 self-start px-1 text-xs font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline'
      >
        <StravaIcon size={12} className='text-strava-orange' />
        View on Strava
        <ExternalLink size={12} aria-hidden='true' />
        <span className='sr-only'>(opens in a new tab)</span>
      </a>
    </article>
  )
}
