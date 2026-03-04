'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, TrendingUp } from 'lucide-react'
import type { LeaderboardUser } from './page'

type Tab = 'runs' | 'distance'

const MEDALS = ['🥇', '🥈', '🥉']
const MEDAL_LABELS = ['1st', '2nd', '3rd']
const MEDAL_RING = [
  'ring-2 ring-stride-yellow-accent shadow-[0_0_16px_rgba(225,208,63,0.4)]',
  'ring-2 ring-white/40',
  'ring-2 ring-amber-700/60',
]
const MEDAL_BADGE_BG = [
  'bg-stride-yellow-accent text-copy-black',
  'bg-white/20 text-white',
  'bg-amber-700/40 text-amber-200',
]

const PAGE_SIZE = 10

function formatDistance(meters: number): string {
  if (meters === 0) return '—'
  const km = meters / 1000
  return `${km.toFixed(1)} km`
}

function Avatar({ user, size = 'md' }: { user: LeaderboardUser; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8'
  const initials = (user.full_name ?? user.username ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (user.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar_url}
        alt={user.full_name ?? user.username}
        className={`${dim} rounded-full object-cover`}
        loading='lazy'
        fetchPriority='low'
      />
    )
  }
  return (
    <div className={`${dim} rounded-full bg-stride-yellow-accent/20 border border-stride-yellow-accent/30 flex items-center justify-center shrink-0`}>
      <span className='text-xs font-bold text-stride-yellow-accent'>{initials}</span>
    </div>
  )
}

function PodiumCard({
  user,
  rank,
  tab,
}: {
  user: LeaderboardUser
  rank: 1 | 2 | 3
  tab: Tab
}) {
  const idx = rank - 1
  const heights = ['mt-0', 'mt-8', 'mt-12']
  const statLabel = tab === 'runs' ? 'runs' : 'distance'
  const statValue =
    tab === 'runs' ? `${user.runs_completed} runs` : formatDistance(user.total_distance_meters)

  return (
    <Link
      href={`/profile/${user.username}`}
      className={`flex flex-col items-center gap-2 ${heights[idx]} transition-transform hover:scale-105`}
    >
      {/* Medal emoji */}
      <span className='text-2xl'>{MEDALS[idx]}</span>

      {/* Avatar */}
      <div className={`rounded-full ${MEDAL_RING[idx]} p-0.5`}>
        <Avatar user={user} size='lg' />
      </div>

      {/* Badge */}
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${MEDAL_BADGE_BG[idx]}`}>
        {MEDAL_LABELS[idx]}
      </span>

      {/* Name */}
      <p className='text-white font-semibold text-sm text-center line-clamp-1 max-w-[80px]'>
        {user.full_name?.split(' ')[0] ?? user.username}
      </p>

      {/* Stat */}
      <p className='text-white/50 text-xs'>
        {statValue}
      </p>

      {/* Pedestal bar */}
      <div
        className={`w-20 rounded-t-md ${idx === 0 ? 'h-10 bg-stride-yellow-accent/30' : idx === 1 ? 'h-7 bg-white/10' : 'h-5 bg-amber-700/20'} border-t ${idx === 0 ? 'border-stride-yellow-accent/50' : idx === 1 ? 'border-white/20' : 'border-amber-700/40'}`}
      />
      <p className='text-white/40 text-xs -mt-1'>{statLabel}</p>
    </Link>
  )
}

export default function LeaderboardClient({
  byRuns,
  byDistance,
}: {
  byRuns: LeaderboardUser[]
  byDistance: LeaderboardUser[]
}) {
  const [tab, setTab] = useState<Tab>('runs')
  const [page, setPage] = useState(0)

  const list = tab === 'runs' ? byRuns : byDistance
  const podium = list.slice(0, 3)
  const tableRows = list.slice(3)
  const pageRows = tableRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(tableRows.length / PAGE_SIZE)

  // reorder podium visually: 2nd | 1st | 3rd
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as LeaderboardUser[]
  const podiumRanks: (1 | 2 | 3)[] = [2, 1, 3]

  return (
    <main className='min-h-screen pt-24 pb-16'>
      <section className='container mx-auto px-4 max-w-3xl'>

        {/* Header */}
        <div className='mb-8 text-center'>
          <h1 className='text-4xl sm:text-5xl font-bold mb-2'>Leaderboard</h1>
          <p className='text-white/50 text-base'>
            The Stride community's top performers — keep showing up.
          </p>
        </div>

        {/* Tab switcher */}
        <div className='flex items-center justify-center gap-2 mb-10'>
          <button
            onClick={() => { setTab('runs'); setPage(0) }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold transition-colors min-h-11 ${
              tab === 'runs'
                ? 'bg-stride-yellow-accent text-copy-black'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            <Trophy className='w-4 h-4' />
            Most Runs Attended
          </button>
          <button
            onClick={() => { setTab('distance'); setPage(0) }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold transition-colors min-h-11 ${
              tab === 'distance'
                ? 'bg-stride-yellow-accent text-copy-black'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            <TrendingUp className='w-4 h-4' />
            Distance Ran
          </button>
        </div>

        {/* Podium */}
        {podium.length > 0 && (
          <div className='flex items-end justify-center gap-4 sm:gap-8 mb-12 px-4'>
            {podiumOrder.map((user, i) => (
              <PodiumCard
                key={user.username}
                user={user}
                rank={podiumRanks[i]}
                tab={tab}
              />
            ))}
          </div>
        )}

        {/* Table */}
        {tableRows.length > 0 && (
          <div className='bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden'>
            <div className='grid grid-cols-[3rem_1fr_auto] sm:grid-cols-[3rem_1fr_auto_auto] px-5 py-3 border-b border-white/10 text-stride-yellow-accent text-xs font-bold uppercase tracking-widest'>
              <span>Rank</span>
              <span>Runner</span>
              <span className='hidden sm:block text-right'>
                {tab === 'runs' ? 'Runs' : 'Distance'}
              </span>
              <span className='text-right sm:hidden'>
                {tab === 'runs' ? 'Runs' : 'Dist'}
              </span>
            </div>

            {pageRows.map((user, i) => {
              const rank = page * PAGE_SIZE + i + 4 // starts at 4 (after podium)
              const stat =
                tab === 'runs'
                  ? `${user.runs_completed}`
                  : formatDistance(user.total_distance_meters)

              return (
                <Link
                  key={user.username}
                  href={`/profile/${user.username}`}
                  className='grid grid-cols-[3rem_1fr_auto] sm:grid-cols-[3rem_1fr_auto_auto] px-5 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors last:border-0 items-center'
                >
                  <span className='text-white/40 font-bold text-sm'>#{rank}</span>
                  <div className='flex items-center gap-3 min-w-0'>
                    <Avatar user={user} size='sm' />
                    <div className='min-w-0'>
                      <p className='text-white font-medium text-sm line-clamp-1'>
                        {user.full_name ?? user.username}
                      </p>
                      <p className='text-white/40 text-xs'>@{user.username}</p>
                    </div>
                  </div>
                  <span className='text-white/70 text-sm font-semibold text-right'>{stat}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className='flex items-center justify-center gap-3 mt-6'>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className='px-4 py-2 rounded-md text-sm font-medium bg-white/10 text-white/70 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-11'
            >
              Previous
            </button>
            <span className='text-white/50 text-sm'>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className='px-4 py-2 rounded-md text-sm font-medium bg-white/10 text-white/70 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-11'
            >
              Next
            </button>
          </div>
        )}

        {list.length === 0 && (
          <div className='text-center py-20 text-white/40'>
            <Trophy className='w-12 h-12 mx-auto mb-4 opacity-30' />
            <p>No runners yet. Be the first to show up!</p>
          </div>
        )}
      </section>
    </main>
  )
}
