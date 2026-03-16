'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { RefreshCw, Unlink, ExternalLink } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { StravaPBs, StravaActivity } from '@/types/strava'

const STRAVA_ICON = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/strava-icon.svg'

type Props = {
  stravaConnected: boolean
  stravaPbs: StravaPBs
  stravaRecentActivities: StravaActivity[]
  stravaSyncedAt: string | null
  isOwnProfile: boolean
}

const PB_LABELS: { key: keyof StravaPBs; label: string }[] = [
  { key: 'mile', label: '1 Mile' },
  { key: '5k', label: '5K' },
  { key: '10k', label: '10K' },
  { key: 'half', label: 'Half' },
  { key: 'full', label: 'Full' },
]

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatPace(avgSpeed: number): string {
  if (!avgSpeed) return '—'
  const paceSecPerKm = 1000 / avgSpeed
  const m = Math.floor(paceSecPerKm / 60)
  const s = Math.round(paceSecPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}/km`
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters} m`
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function StravaSection({ stravaConnected, stravaPbs, stravaRecentActivities, stravaSyncedAt, isOwnProfile }: Props) {
  const [removing, setRemoving] = useState(false)
  const router = useRouter()

  const hasPbs = Object.values(stravaPbs).some(Boolean)
  const hasActivities = stravaRecentActivities.length > 0

  async function handleRemove() {
    setRemoving(true)
    await fetch('/api/strava/disconnect', { method: 'POST' })
    setRemoving(false)
    router.refresh()
  }

  // Not connected and not own profile — nothing to show
  if (!stravaConnected && !isOwnProfile) return null

  // Not connected — own profile sees the connect prompt
  if (!stravaConnected) {
    return (
      <div className='mt-8'>
        <p className='text-white/40 text-xs uppercase tracking-widest mb-3'>Strava</p>
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5'>
          <div className='flex items-center gap-2 mb-2'>
            <Image src={STRAVA_ICON} alt='Strava' width={16} height={16} />
            <span className='text-white font-medium text-sm'>Connect Strava</span>
          </div>
          <p className='text-white/50 text-sm mb-4'>
            Sign in with your Strava account to display your personal bests and recent workouts.
          </p>
          <a
            href='/api/strava/connect'
            className='inline-flex items-center gap-2 px-4 py-2.5 bg-[#FC4C02] text-white text-sm font-semibold rounded-md hover:bg-[#e04400] transition-colors min-h-11'
          >
            <Image src={STRAVA_ICON} alt='' width={15} height={15} />
            Connect with Strava
          </a>
        </div>
      </div>
    )
  }

  // Connected — show PBs + recent activities
  return (
    <div className='mt-8'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <p className='text-white/40 text-xs uppercase tracking-widest'>Strava</p>
          {stravaSyncedAt && (
            <span className='text-white/25 text-xs'>
              · {formatRelativeDate(stravaSyncedAt)}
            </span>
          )}
        </div>
        {isOwnProfile && (
          <div className='flex items-center gap-3'>
            <a
              href='/api/strava/connect'
              className='flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors'
              title='Re-authenticate with Strava to pull latest data'
            >
              <RefreshCw size={12} />
              Refresh
            </a>
            <button
              onClick={handleRemove}
              disabled={removing}
              className='flex items-center gap-1.5 text-xs text-white/30 hover:text-red-400 transition-colors disabled:opacity-50'
              title='Remove Strava data from profile'
            >
              {removing ? <Spinner /> : <Unlink size={12} />}
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Personal Bests */}
      {hasPbs && (
        <div className='mb-5'>
          <p className='text-white/30 text-xs uppercase tracking-wider mb-2'>Personal Bests</p>
          <div className='grid grid-cols-5 gap-2'>
            {PB_LABELS.map(({ key, label }) => {
              const pb = stravaPbs[key]
              return (
                <div
                  key={key}
                  className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 flex flex-col items-center text-center'
                >
                  <span className='text-white/40 text-[10px] uppercase tracking-wider mb-1'>{label}</span>
                  {pb ? (
                    <>
                      <span className='text-white font-bold text-sm tabular-nums'>{formatTime(pb.time)}</span>
                      <span className='text-white/30 text-[10px] mt-0.5'>{formatRelativeDate(pb.date)}</span>
                    </>
                  ) : (
                    <span className='text-white/25 text-sm'>—</span>
                  )}
                </div>
              )
            })}
          </div>
          <p className='text-white/20 text-[10px] mt-2'>
            Best race times from last 100 runs · <a href='https://www.strava.com' target='_blank' rel='noopener noreferrer' className='hover:text-white/40 transition-colors'>view full data on Strava</a>
          </p>
        </div>
      )}

      {!hasPbs && (
        <p className='mb-5 text-white/30 text-sm italic'>
          No race times found in your last 100 runs yet.
        </p>
      )}

      {/* Recent Workouts */}
      {hasActivities && (
        <div>
          <p className='text-white/30 text-xs uppercase tracking-wider mb-2'>Recent Workouts</p>
          <div className='space-y-2'>
            {stravaRecentActivities.map((act) => (
              <div
                key={act.id}
                className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 hover:border-stride-yellow-accent/30 transition-colors'
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='text-white text-sm font-medium truncate'>{act.name}</p>
                    <p className='text-white/40 text-xs mt-0.5'>{formatRelativeDate(act.start_date)}</p>
                  </div>
                  <a
                    href={`https://www.strava.com/activities/${act.id}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-white/25 hover:text-[#FC4C02] transition-colors mt-0.5 shrink-0'
                    aria-label='View on Strava'
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
                <div className='flex items-center gap-3 mt-2 text-white/50 text-xs tabular-nums'>
                  <span className='flex items-center gap-1'>
                    <Image src={STRAVA_ICON} alt='' width={11} height={11} className='opacity-60' />
                    {formatDistance(act.distance)}
                  </span>
                  <span>{formatTime(act.moving_time)}</span>
                  <span>{formatPace(act.average_speed)}</span>
                  {act.average_heartrate && (
                    <span>{Math.round(act.average_heartrate)} bpm</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasActivities && (
        <p className='text-white/30 text-sm italic'>No recent runs found.</p>
      )}
    </div>
  )
}
