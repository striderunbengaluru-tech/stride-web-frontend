'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Trophy, Crown, ChevronLeft, ChevronRight } from 'lucide-react'
import { getMilestone } from '@/lib/milestones'
import { TierBadge } from '@/components/ui/tier-badge'
import type { LeaderboardUser } from './page'

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

function initialsOf(user: LeaderboardUser): string {
  return (user.full_name ?? user.username ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const runLabel = (n: number) => `${n} ${n === 1 ? 'run' : 'runs'}`

/**
 * `placeholder` forces the initials tile even when the member has a photo — used
 * for private profiles, which expose nothing but a name and a run count.
 */
function Avatar({
  user,
  size = 'md',
  placeholder = false,
}: {
  user: LeaderboardUser
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

function PodiumColumn({ user, rank }: { user: LeaderboardUser; rank: 1 | 2 | 3 }) {
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

      {/* Run count is the whole point of the board, so the number carries the
          weight and the unit shrinks to a label beside it. As one 12px line it
          was the smallest text in the podium. */}
      <p className='flex items-baseline gap-1 font-mono tabular-nums'>
        <span className={`font-bold leading-none text-white ${rank === 1 ? 'text-3xl' : 'text-2xl'}`}>
          {user.runs_completed}
        </span>
        <span className='text-[11px] font-medium text-white/50'>
          {user.runs_completed === 1 ? 'run' : 'runs'}
        </span>
      </p>
    </motion.div>
  )

  return (
    <div className='flex w-full max-w-36 flex-col items-center justify-end sm:max-w-44'>
      {isPublic ? (
        <Link
          href={`/profile/${user.username}`}
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

type MyPosition = {
  signedIn: boolean
  rank?: number | null
  total?: number
  runsCompleted?: number
  username?: string
  fullName?: string | null
  avatarUrl?: string | null
}

/**
 * The viewer's own standing. Fetched client-side on purpose: reading the session
 * on the server would make the whole leaderboard route dynamic and throw away
 * its 5-minute ISR cache. Renders nothing at all for signed-out visitors.
 */
function YourPosition() {
  const [me, setMe] = useState<MyPosition | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/leaderboard/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled) setMe(data) })
      .catch(() => { /* a missing standing is not worth surfacing */ })
    return () => { cancelled = true }
  }, [])

  if (!me?.signedIn || !me.rank || !me.username) return null

  const tier = getMilestone(me.runsCompleted ?? 0)

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
            full_name: me.fullName ?? null,
            avatar_url: me.avatarUrl ?? null,
            runs_completed: me.runsCompleted ?? 0,
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
        {runLabel(me.runsCompleted ?? 0)}
      </span>
    </Link>
  )
}

export default function LeaderboardClient({
  byRuns,
  totalAthletes,
}: {
  byRuns: LeaderboardUser[]
  totalAthletes: number
}) {
  const [page, setPage] = useState(0)

  const podium = byRuns.slice(0, 3)
  const tableRows = byRuns.slice(3)
  const pageRows = tableRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(tableRows.length / PAGE_SIZE)

  // Visual order 2nd | 1st | 3rd, so first place stands in the middle.
  const podiumOrder = [podium[1], podium[0], podium[2]]
    .map((u, i) => (u ? { user: u, rank: ([2, 1, 3] as const)[i] } : null))
    .filter(Boolean) as { user: LeaderboardUser; rank: 1 | 2 | 3 }[]

  return (
    <main className='min-h-screen pt-32 pb-16 sm:pt-36'>
      <section className='container mx-auto max-w-3xl px-4'>

        {/* Header */}
        <div className='mb-12 text-center'>
          <p className='mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-stride-yellow-accent'>
            Most runs attended
          </p>
          <h1 className='mb-2 font-libre text-4xl font-bold sm:text-5xl'>Leaderboard</h1>
          <p className='text-base text-white/50'>
            Counts update when you check in at a run.
          </p>
        </div>

        {/* Viewer's own standing — signed-in members only */}
        <YourPosition />

        {/* Podium */}
        {podium.length > 0 && (
          <div className='mb-12 flex items-end justify-center gap-3 px-2 sm:gap-6'>
            {podiumOrder.map(({ user, rank }) => (
              <PodiumColumn key={user.username} user={user} rank={rank} />
            ))}
          </div>
        )}

        {/* 4th onwards */}
        {tableRows.length > 0 && (
          <div className='overflow-hidden rounded-2xl border border-white/12 bg-white/4 shadow-2xl shadow-black/20 backdrop-blur-md'>
            <div className='grid grid-cols-[3.5rem_1fr_auto] items-center border-b border-white/10 bg-white/3 px-5 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-stride-yellow-accent/80'>
              <span>Rank</span>
              <span>Athlete</span>
              <span className='text-right'>Runs</span>
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
                      {/* Private profiles stop here — name and runs only */}
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
                  {/* Same treatment as the podium: a bare 14px numeral read as
                      incidental next to the name, when it's the value the whole
                      row is ordered by. */}
                  <span className='text-right font-mono tabular-nums'>
                    <span className='block text-xl font-bold leading-none text-white'>
                      {user.runs_completed}
                    </span>
                    <span className='mt-0.5 block text-[10px] font-medium uppercase tracking-wider text-white/40'>
                      {user.runs_completed === 1 ? 'run' : 'runs'}
                    </span>
                  </span>
                </>
              )

              return isPublic ? (
                <Link
                  key={user.username}
                  href={`/profile/${user.username}`}
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className='mt-8 flex items-center justify-center gap-2'>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label='Previous page'
              className='group inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-medium text-white/70 transition-all hover:border-stride-yellow-accent/40 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25'
            >
              <ChevronLeft size={16} aria-hidden='true' className='transition-transform group-hover:-translate-x-0.5' />
              Previous
            </button>

            <span className='px-3 font-mono text-xs tabular-nums text-white/40'>
              {page + 1} <span className='text-white/20'>/</span> {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              aria-label='Next page'
              className='group inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-medium text-white/70 transition-all hover:border-stride-yellow-accent/40 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25'
            >
              Next
              <ChevronRight size={16} aria-hidden='true' className='transition-transform group-hover:translate-x-0.5' />
            </button>
          </div>
        )}

        {byRuns.length === 0 && (
          <div className='py-20 text-center text-white/40'>
            <Trophy className='mx-auto mb-4 h-12 w-12 opacity-30' aria-hidden='true' />
            <p>No athletes yet. Be the first to show up!</p>
          </div>
        )}

        {/* Ranking rule — matches the tie-break in lib/leaderboard.ts */}
        {byRuns.length > 0 && (
          <p className='mx-auto mt-8 max-w-lg text-center text-xs leading-relaxed text-white/30'>
            Athletes with the same number of runs completed, the one who completed
            the runs first will rank higher.
            {totalAthletes > byRuns.length && (
              <> Showing the top {byRuns.length} of {totalAthletes} athletes.</>
            )}
          </p>
        )}
      </section>
    </main>
  )
}
