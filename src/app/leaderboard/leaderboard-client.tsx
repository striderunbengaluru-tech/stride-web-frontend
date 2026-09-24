'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Trophy, Crown, ChevronLeft, ChevronRight } from 'lucide-react'
import { getMilestone } from '@/lib/milestones'
import { TierBadge } from '@/components/ui/tier-badge'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { PoweredByStrava } from '@/components/ui/powered-by-strava'
import { StravaIcon } from '@/components/ui/brand-icons'
import type { LeaderboardRow, ViewerStanding } from '@/lib/leaderboard'

// Per-place styling, index 0 = 1st: brand yellow, then cool slate, then bronze.
const PLACE = [
  {
    ring: 'ring-2 ring-stride-yellow-accent shadow-[0_0_18px_rgba(225,208,63,0.45)]',
    crown: 'bg-stride-yellow-accent text-copy-black',
    pedestal: 'bg-stride-yellow-accent/25 border-stride-yellow-accent/60',
    rankText: 'text-stride-yellow-accent',
    height: 'h-24 sm:h-28',
  },
  {
    ring: 'ring-2 ring-slate-300/60',
    crown: 'bg-slate-300 text-slate-900',
    pedestal: 'bg-slate-400/20 border-slate-300/40',
    rankText: 'text-slate-300',
    height: 'h-16 sm:h-20',
  },
  {
    ring: 'ring-2 ring-amber-700/70',
    crown: 'bg-amber-700 text-amber-50',
    pedestal: 'bg-amber-800/25 border-amber-700/50',
    rankText: 'text-amber-500',
    height: 'h-12 sm:h-14',
  },
] as const

const PAGE_SIZE = 10
const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]
const METRES_PER_KM = 1000

export type BoardKey = 'runs' | 'km'

/** A board row: the public athlete fields plus the number it's ranked by. */
export type BoardEntry = LeaderboardRow & { value: number }

export type Board = { rows: BoardEntry[]; totalAthletes: number }

type Metric = {
  format: (value: number) => string
  unit: (value: number) => string
  column: string
  eyebrow: string
  subtitle: string
  rule: string
  empty: string
}

const kmFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const METRICS: Record<BoardKey, Metric> = {
  runs: {
    format: value => String(value),
    unit: value => (value === 1 ? 'run' : 'runs'),
    column: 'Runs',
    eyebrow: 'Most runs attended',
    subtitle: 'Counts update when you check in at a run.',
    rule: 'Athletes with the same number of runs completed, the one who completed the runs first will rank higher.',
    empty: 'No athletes yet. Be the first to show up!',
  },
  km: {
    // Values are metres; km is a display unit only.
    format: value => kmFormatter.format(value / METRES_PER_KM),
    unit: () => 'km',
    column: 'Km',
    eyebrow: 'Kilometres this year',
    subtitle: 'Year-to-date running distance, synced from Strava.',
    rule: 'Counts the runs you share publicly on Strava since 1 January. Athletes on the same distance are ordered by username.',
    empty: 'No Strava runs logged this year yet. Connect Strava from your profile to get on the board.',
  },
}

const BOARD_OPTIONS = [
  { value: 'runs', label: 'Most Stride runs' },
  { value: 'km', label: 'Km this year' },
] as const

function initialsOf(user: LeaderboardRow): string {
  return (user.full_name ?? user.username ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * `placeholder` forces the initials tile even when the member has a photo — used
 * for private profiles, which expose nothing but a name and a number.
 */
function Avatar({
  user,
  size = 'md',
  placeholder = false,
}: {
  user: LeaderboardRow
  size?: 'sm' | 'md' | 'lg'
  placeholder?: boolean
}) {
  const dim =
    size === 'lg' ? 'w-24 h-24 sm:w-28 sm:h-28' : size === 'md' ? 'w-12 h-12' : 'w-9 h-9'
  const textSize = size === 'lg' ? 'text-2xl sm:text-3xl' : size === 'md' ? 'text-sm' : 'text-xs'

  if (user.avatar_url && !placeholder) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar_url}
        alt={user.full_name ?? user.username}
        className={`${dim} rounded-full object-cover shrink-0`}
        loading='lazy'
        fetchPriority='low'
      />
    )
  }
  return (
    <div className={`${dim} rounded-full bg-stride-yellow-accent/20 border border-stride-yellow-accent/30 flex items-center justify-center shrink-0`}>
      <span className={`${textSize} font-bold text-stride-yellow-accent`}>{initialsOf(user)}</span>
    </div>
  )
}

function PodiumColumn({ user, rank, metric }: { user: BoardEntry; rank: 1 | 2 | 3; metric: Metric }) {
  const idx = rank - 1
  const place = PLACE[idx]
  const isPublic = user.profile_public
  const tier = getMilestone(user.runs_completed)
  const delay = [0, 0.12, 0.24][idx]

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className='flex flex-col items-center gap-2'
    >
      {/* Avatar + crown chip */}
      <div className='relative'>
        <div className={`rounded-full ${place.ring}`}>
          <Avatar user={user} size='lg' placeholder={!isPublic} />
        </div>
        <span
          aria-hidden='true'
          className={`absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-stride-purple-primary ${place.crown}`}
        >
          <Crown size={15} />
        </span>
      </div>

      <p className='text-white font-semibold text-sm text-center line-clamp-1 max-w-32 sm:max-w-40'>
        {user.full_name ?? user.username}
      </p>

      {/* Tier — public profiles only */}
      {isPublic && (
        <span className='inline-flex items-center gap-1 text-[10px] text-white/60 max-w-32 sm:max-w-40'>
          <TierBadge tier={tier} size='sm' />
          <span className='line-clamp-1'>{tier.label}</span>
        </span>
      )}

      {/* The ranked value is the whole point of the board, so the number carries
          the weight and the unit shrinks to a label beside it. */}
      <p className='flex items-baseline gap-1 font-mono tabular-nums'>
        <span className={`font-bold leading-none text-white ${rank === 1 ? 'text-3xl' : 'text-2xl'}`}>
          {metric.format(user.value)}
        </span>
        <span className='text-[11px] font-medium text-white/50'>{metric.unit(user.value)}</span>
      </p>
    </motion.div>
  )

  return (
    <div className='flex w-full max-w-36 flex-col items-center justify-end sm:max-w-44'>
      {/* prefetch off on the profile links below: /profile/[username] is still
          rendered per request, so prefetching would cost a server render for
          every athlete listed, on links most visitors never click. */}
      {isPublic ? (
        <Link
          href={`/profile/${user.username}`}
          prefetch={false}
          className='transition-transform hover:scale-105'
        >
          {card}
        </Link>
      ) : (
        card
      )}

      {/* Pedestal — the bar grows out of the floor, the numeral fades in after */}
      <div className={`relative mt-3 w-full ${place.height}`}>
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.55, ease: EASE, delay: delay + 0.1 }}
          style={{ transformOrigin: 'bottom' }}
          className={`absolute inset-0 rounded-t-lg border-t border-x ${place.pedestal}`}
        />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: delay + 0.45 }}
          className={`absolute inset-x-0 top-2 text-center text-xl font-bold ${place.rankText}`}
        >
          {rank}
        </motion.span>
      </div>
    </div>
  )
}

/** The viewer's own row on the selected board, as `YourPosition` renders it. */
type PositionRow = {
  rank: number
  value: number
  runsCompleted: number
  username: string
  fullName: string | null
  avatarUrl: string | null
}

function positionFor(board: BoardKey, standing: ViewerStanding): PositionRow | null {
  if (board === 'runs') {
    const me = standing.runs
    return me ? { ...me, value: me.runsCompleted } : null
  }
  const me = standing.km
  return me ? { ...me, value: me.ytdDistanceM } : null
}

function ConnectStravaPrompt({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <p className='mb-8 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center text-sm text-white/70 backdrop-blur-md'>
        Your Strava is connected. You&rsquo;ll appear here once a public run from this year syncs.
      </p>
    )
  }
  return (
    <div className='mb-8 flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center backdrop-blur-md sm:flex-row sm:text-left'>
      <StravaIcon size={20} className='shrink-0 text-strava-orange' />
      <p className='flex-1 text-sm text-white/80'>Connect Strava to join this board with your kilometres this year.</p>
      {/* A GET form, not <Link>: this is a full-page redirect into Strava's OAuth flow. */}
      <form action='/api/strava/connect' method='get' className='shrink-0'>
        <button
          type='submit'
          className='inline-flex min-h-11 items-center rounded-md bg-stride-yellow-accent px-4 text-sm font-semibold text-copy-black transition-opacity hover:opacity-90'
        >
          Connect Strava
        </button>
      </form>
    </div>
  )
}

/**
 * The viewer's own standing. Fetched client-side (by the parent) on purpose:
 * reading the session on the server would make the whole leaderboard route
 * dynamic and throw away its ISR cache. Renders nothing for signed-out visitors.
 */
function YourPosition({ board, standing, metric }: { board: BoardKey; standing: ViewerStanding | null; metric: Metric }) {
  if (!standing?.signedIn) return null

  const me = positionFor(board, standing)
  if (!me) {
    return board === 'km' ? <ConnectStravaPrompt connected={Boolean(standing.stravaConnected)} /> : null
  }

  const tier = getMilestone(me.runsCompleted)

  return (
    <Link
      href={`/profile/${me.username}`}
      className='group mb-8 flex items-center gap-4 rounded-2xl border border-stride-yellow-accent/35 bg-stride-yellow-accent/8 px-5 py-4 transition-colors hover:border-stride-yellow-accent/60'
    >
      <span className='font-mono text-lg font-bold tabular-nums text-stride-yellow-accent'>
        #{me.rank}
      </span>
      <div className='rounded-full ring-1 ring-stride-yellow-accent/40'>
        <Avatar
          user={{
            username: me.username,
            full_name: me.fullName,
            avatar_url: me.avatarUrl,
            runs_completed: me.runsCompleted,
            profile_public: true,
          }}
          size='md'
        />
      </div>
      <div className='min-w-0 flex-1'>
        <p className='text-[10px] font-bold font-mono uppercase tracking-widest text-stride-yellow-accent/70'>
          Your position
        </p>
        <p className='line-clamp-1 text-sm font-semibold text-white'>
          {me.fullName ?? me.username}
        </p>
      </div>
      <span className='inline-flex shrink-0 items-center gap-1 text-xs text-white/60'>
        <TierBadge tier={tier} size='sm' />
        <span className='hidden sm:inline'>{tier.label}</span>
      </span>
      <span className='shrink-0 font-mono text-sm font-semibold tabular-nums text-white/80'>
        {metric.format(me.value)} {metric.unit(me.value)}
      </span>
    </Link>
  )
}

function BoardTable({ rows, page, metric }: { rows: BoardEntry[]; page: number; metric: Metric }) {
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className='overflow-hidden rounded-2xl border border-white/12 bg-white/4 shadow-2xl shadow-black/20 backdrop-blur-md'>
      <div className='grid grid-cols-[3.5rem_1fr_auto] items-center border-b border-white/10 bg-white/3 px-5 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-stride-yellow-accent/80'>
        <span>Rank</span>
        <span>Athlete</span>
        <span className='text-right'>{metric.column}</span>
      </div>

      {pageRows.map((user, i) => {
        const rank = page * PAGE_SIZE + i + 4 // podium takes 1-3
        const isPublic = user.profile_public
        const tier = getMilestone(user.runs_completed)
        const rowClass =
          'group grid grid-cols-[3.5rem_1fr_auto] items-center border-b border-white/6 px-5 py-4 last:border-0'

        const rowContent = (
          <>
            <span className='font-mono text-sm font-semibold tabular-nums text-white/30 transition-colors group-hover:text-stride-yellow-accent/70'>
              {String(rank).padStart(2, '0')}
            </span>
            <div className='flex min-w-0 items-center gap-3.5'>
              <div className='rounded-full ring-1 ring-white/15 transition-colors group-hover:ring-stride-yellow-accent/40'>
                <Avatar user={user} size='md' placeholder={!isPublic} />
              </div>
              <div className='min-w-0'>
                <p className='line-clamp-1 text-sm font-semibold text-white transition-colors group-hover:text-stride-yellow-accent'>
                  {user.full_name ?? user.username}
                </p>
                {/* Private profiles stop here — name and number only */}
                {isPublic && (
                  <div className='flex min-w-0 items-center gap-2'>
                    <p className='shrink-0 text-xs text-white/40'>@{user.username}</p>
                    <span className='inline-flex min-w-0 items-center gap-1 text-xs text-white/50'>
                      <TierBadge tier={tier} size='sm' />
                      <span className='line-clamp-1'>{tier.label}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <span className='text-right font-mono tabular-nums'>
              <span className='block text-xl font-bold leading-none text-white'>
                {metric.format(user.value)}
              </span>
              <span className='mt-0.5 block text-[10px] font-medium uppercase tracking-wider text-white/40'>
                {metric.unit(user.value)}
              </span>
            </span>
          </>
        )

        return isPublic ? (
          <Link
            key={user.username}
            href={`/profile/${user.username}`}
            prefetch={false}
            className={`${rowClass} transition-colors hover:bg-white/5`}
          >
            {rowContent}
          </Link>
        ) : (
          <div key={user.username} className={rowClass}>
            {rowContent}
          </div>
        )
      })}
    </div>
  )
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  const buttonClass =
    'group inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-medium text-white/70 transition-all hover:border-stride-yellow-accent/40 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25'

  return (
    <div className='mt-8 flex items-center justify-center gap-2'>
      <button
        onClick={() => onPage(Math.max(0, page - 1))}
        disabled={page === 0}
        aria-label='Previous page'
        className={buttonClass}
      >
        <ChevronLeft size={16} aria-hidden='true' className='transition-transform group-hover:-translate-x-0.5' />
        Previous
      </button>

      <span className='px-3 font-mono text-xs tabular-nums text-white/40'>
        {page + 1} <span className='text-white/20'>/</span> {totalPages}
      </span>

      <button
        onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
        disabled={page === totalPages - 1}
        aria-label='Next page'
        className={buttonClass}
      >
        Next
        <ChevronRight size={16} aria-hidden='true' className='transition-transform group-hover:translate-x-0.5' />
      </button>
    </div>
  )
}

/** Fetches the signed-in viewer's standing on both boards, once. */
function useViewerStanding(): ViewerStanding | null {
  const [standing, setStanding] = useState<ViewerStanding | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/leaderboard/me')
      .then(r => (r.ok ? r.json() : null))
      .then((data: ViewerStanding | null) => { if (!cancelled) setStanding(data) })
      .catch(() => { /* a missing standing is not worth surfacing */ })
    return () => { cancelled = true }
  }, [])

  return standing
}

export default function LeaderboardClient({
  boards,
}: {
  /** `km` is null when Strava data isn't shown publicly — the toggle then hides. */
  boards: { runs: Board; km: Board | null }
}) {
  const [boardKey, setBoardKey] = useState<BoardKey>('runs')
  const [page, setPage] = useState(0)
  const standing = useViewerStanding()

  const board = (boardKey === 'km' ? boards.km : null) ?? boards.runs
  const activeKey: BoardKey = board === boards.runs ? 'runs' : 'km'
  const metric = METRICS[activeKey]

  const podium = board.rows.slice(0, 3)
  const tableRows = board.rows.slice(3)
  const totalPages = Math.ceil(tableRows.length / PAGE_SIZE)

  // Visual order 2nd | 1st | 3rd, so first place stands in the middle.
  const podiumOrder = [podium[1], podium[0], podium[2]]
    .map((u, i) => (u ? { user: u, rank: ([2, 1, 3] as const)[i] } : null))
    .filter(Boolean) as { user: BoardEntry; rank: 1 | 2 | 3 }[]

  function selectBoard(next: BoardKey) {
    setBoardKey(next)
    setPage(0)
  }

  return (
    <main className='min-h-screen pt-32 pb-16 sm:pt-36'>
      <section className='container mx-auto max-w-3xl px-4'>

        {/* Header */}
        <div className='mb-8 text-center'>
          <p className='mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-stride-yellow-accent'>
            {metric.eyebrow}
          </p>
          <h1 className='mb-2 font-libre text-4xl font-bold sm:text-5xl'>Leaderboard</h1>
          <p className='text-base text-white/50'>{metric.subtitle}</p>
          {activeKey === 'km' && <PoweredByStrava className='mt-3' />}
        </div>

        {boards.km && (
          <div className='mb-10 flex justify-center'>
            <SegmentedControl
              options={BOARD_OPTIONS}
              value={activeKey}
              onChange={selectBoard}
              label='Leaderboard'
              idPrefix='leaderboard'
              className='w-full max-w-sm'
            />
          </div>
        )}

        <div
          id='leaderboard-panel'
          role={boards.km ? 'tabpanel' : undefined}
          aria-labelledby={boards.km ? `leaderboard-tab-${activeKey}` : undefined}
        >
          {/* Viewer's own standing — signed-in members only */}
          <YourPosition board={activeKey} standing={standing} metric={metric} />

          {/* Podium */}
          {podium.length > 0 && (
            <div className='mb-12 flex items-end justify-center gap-3 px-2 sm:gap-6'>
              {podiumOrder.map(({ user, rank }) => (
                <PodiumColumn key={`${activeKey}-${user.username}`} user={user} rank={rank} metric={metric} />
              ))}
            </div>
          )}

          {/* 4th onwards */}
          {tableRows.length > 0 && <BoardTable rows={tableRows} page={page} metric={metric} />}

          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPage={setPage} />}

          {board.rows.length === 0 && (
            <div className='py-20 text-center text-white/40'>
              <Trophy className='mx-auto mb-4 h-12 w-12 opacity-30' aria-hidden='true' />
              <p>{metric.empty}</p>
            </div>
          )}

          {/* Ranking rule — matches the tie-break in the board's SQL function */}
          {board.rows.length > 0 && (
            <p className='mx-auto mt-8 max-w-lg text-center text-xs leading-relaxed text-white/30'>
              {metric.rule}
              {board.totalAthletes > board.rows.length && (
                <> Showing the top {board.rows.length} of {board.totalAthletes} athletes.</>
              )}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
