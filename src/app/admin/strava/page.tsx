import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { adminClient } from '@/lib/supabase/admin'
import { requireFullAdmin } from '@/lib/auth/admin-access'
import { StravaIcon } from '@/components/ui/brand-icons'
import { STRAVA_ATHLETE_CAP } from '@/lib/strava/config'
import { currentIstYear } from '@/lib/strava/connection'
import { formatDateShortIST, formatDateTimeIST } from '@/lib/utils/ist'

export const metadata = { title: 'Strava — Admin' }

const METRES_PER_KM = 1000
/** The daily reconcile cron runs every 24 h; beyond this a sync was missed. */
const STALE_SYNC_MS = 36 * 60 * 60 * 1000

const kmFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

type ConnectionRow = {
  athlete_id: number
  ytd_run_distance_m: number
  ytd_run_count: number
  ytd_year: number
  connected_at: string
  last_synced_at: string | null
  // To-one embed (strava_connections.user_id → users.id): an object, not an array.
  users: {
    full_name: string | null
    username: string | null
    email: string | null
    avatar_url: string | null
    runner_tag: string | null
  } | null
}

type ConnectionView = ConnectionRow & { syncStale: boolean }

/** Reads every connection (never the token columns) and flags missed syncs. */
async function loadConnections(): Promise<{ connections: ConnectionView[]; failed: boolean }> {
  const { data, error } = await adminClient
    .from('strava_connections')
    .select('athlete_id, ytd_run_distance_m, ytd_run_count, ytd_year, connected_at, last_synced_at, users(full_name, username, email, avatar_url, runner_tag)')
    .order('connected_at', { ascending: false })

  if (error) {
    console.error('[admin/strava] connections read failed', { error: error.message })
    return { connections: [], failed: true }
  }

  const now = Date.now()
  const connections = ((data ?? []) as unknown as ConnectionRow[]).map(row => ({
    ...row,
    syncStale: !row.last_synced_at || now - new Date(row.last_synced_at).getTime() > STALE_SYNC_MS,
  }))
  return { connections, failed: false }
}

function SyncStatus({ lastSyncedAt, stale }: { lastSyncedAt: string | null; stale: boolean }) {
  if (!lastSyncedAt) {
    return <span className='text-amber-300'>Never synced</span>
  }
  return (
    <span className={stale ? 'text-amber-300' : 'text-white/70'}>
      {formatDateTimeIST(lastSyncedAt)}
      {stale && <span className='ml-1 font-semibold'>· stale</span>}
    </span>
  )
}

/**
 * Every member who has connected Strava, and how the app's athlete allowance
 * is being used. Read-only: tokens are never selected here.
 */
export default async function AdminStravaPage() {
  // ADMIN only — before the first adminClient call, which bypasses RLS.
  await requireFullAdmin()

  const { connections, failed } = await loadConnections()
  const year = currentIstYear()
  const spotsLeft = Math.max(STRAVA_ATHLETE_CAP - connections.length, 0)

  return (
    <div className='max-w-6xl mx-auto'>
      <div className='mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div className='flex items-center gap-3'>
          <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10'>
            <StravaIcon size={18} className='text-strava-orange' />
          </span>
          <div>
            <h1 className='text-3xl font-bold text-white'>Strava</h1>
            <p className='text-sm text-white/50'>Members who have connected their Strava account.</p>
          </div>
        </div>
        <p className='font-mono text-sm tabular-nums text-white/70'>
          <span className='font-bold text-white'>{connections.length}</span> / {STRAVA_ATHLETE_CAP} athlete spots used
          {spotsLeft === 0 && <span className='ml-2 text-amber-300'>· full</span>}
        </p>
      </div>

      {failed && (
        <p role='alert' className='mb-6 rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100'>
          Couldn&rsquo;t load Strava connections. Please refresh to try again.
        </p>
      )}

      {!failed && connections.length === 0 ? (
        <p className='rounded-xl border border-white/15 bg-white/10 px-4 py-10 text-center text-sm text-white/60 backdrop-blur-md'>
          No one has connected Strava yet.
        </p>
      ) : (
        <ul className='space-y-3'>
          {connections.map(connection => {
            const member = connection.users
            const name = member?.full_name ?? member?.username ?? 'Unknown member'
            const ytdM = connection.ytd_year === year ? connection.ytd_run_distance_m : 0
            const runs = connection.ytd_year === year ? connection.ytd_run_count : 0

            return (
              <li
                key={connection.athlete_id}
                className='grid grid-cols-1 gap-4 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md transition-colors hover:border-stride-yellow-accent/50 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-center'
              >
                {/* Member */}
                <div className='flex min-w-0 items-center gap-3'>
                  {member?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar_url}
                      alt=''
                      className='h-11 w-11 shrink-0 rounded-full object-cover'
                      loading='lazy'
                      fetchPriority='low'
                    />
                  ) : (
                    <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stride-yellow-accent/30 bg-stride-yellow-accent/20 text-sm font-bold text-stride-yellow-accent'>
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className='min-w-0'>
                    {member?.username ? (
                      <Link
                        href={`/profile/${member.username}`}
                        prefetch={false}
                        className='line-clamp-1 text-sm font-semibold text-white hover:text-stride-yellow-accent'
                      >
                        {name}
                      </Link>
                    ) : (
                      <p className='line-clamp-1 text-sm font-semibold text-white'>{name}</p>
                    )}
                    <p className='line-clamp-1 text-xs text-white/50'>
                      {member?.email ?? '—'}
                      {member?.runner_tag && <span className='ml-2 font-mono text-white/40'>#{member.runner_tag}</span>}
                    </p>
                  </div>
                </div>

                {/* This year */}
                <div>
                  <p className='font-mono text-[10px] uppercase tracking-widest text-white/50'>This year</p>
                  <p className='font-mono text-sm font-semibold tabular-nums text-white'>
                    {kmFormatter.format(ytdM / METRES_PER_KM)} km
                    <span className='ml-1.5 font-normal text-white/50'>· {runs} {runs === 1 ? 'run' : 'runs'}</span>
                  </p>
                </div>

                {/* Connection */}
                <div className='text-xs'>
                  <p className='text-white/50'>
                    Connected <span className='text-white/70'>{formatDateShortIST(connection.connected_at)}</span>
                  </p>
                  <p className='text-white/50'>
                    Last sync <SyncStatus lastSyncedAt={connection.last_synced_at} stale={connection.syncStale} />
                  </p>
                </div>

                <a
                  href={`https://www.strava.com/athletes/${connection.athlete_id}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex min-h-11 items-center gap-1.5 justify-self-start rounded-md border border-white/15 px-3 text-xs font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white md:justify-self-end'
                >
                  <StravaIcon size={12} className='text-strava-orange' />
                  Strava profile
                  <ExternalLink size={12} aria-hidden='true' />
                  <span className='sr-only'>(opens in a new tab)</span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
