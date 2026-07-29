import type { Metadata } from 'next'
import LeaderboardClient from './leaderboard-client'
import { getRankedAthletes, toPublicRow, type LeaderboardRow } from '@/lib/leaderboard'
import { DEFAULT_OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from '@/lib/seo'

// Previously an untyped object with a title only: no description for search
// results, and no openGraph, so it inherited the layout's and every share
// previewed as the homepage. The brand suffix comes from the title template.
export const metadata: Metadata = {
  title: 'Leaderboard — Most Runs Attended',
  description:
    'Who shows up the most. The Stride leaderboard ranks Bengaluru’s athletes by community runs attended — counts update the moment you check in at a run.',
  keywords: ['Stride Run Club leaderboard', 'running leaderboard Bengaluru', 'most runs attended', 'run club rankings'],
  alternates: { canonical: '/leaderboard' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Stride Run Club',
    url: '/leaderboard',
    title: 'Leaderboard — Stride Run Club',
    description: 'Who shows up the most. Ranked by community runs attended, updated at every check-in.',
    images: [{ url: DEFAULT_OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: 'Stride Run Club leaderboard — most runs attended' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leaderboard — Stride Run Club',
    description: 'Who shows up the most. Ranked by community runs attended.',
    images: [DEFAULT_OG_IMAGE],
  },
}

// Revalidate every 5 minutes so the board stays reasonably fresh
export const revalidate = 300

export type LeaderboardUser = LeaderboardRow

const BOARD_SIZE = 50

export default async function LeaderboardPage() {
  // No cookies anywhere in this route — that's what keeps it ISR. A previous
  // version read cookies via createClient() and silently defeated
  // `revalidate = 300`. The viewer's own position is fetched client-side from
  // /api/leaderboard/me instead, so this stays cacheable for everyone.
  //
  // It also used to select `total_distance_meters` for a second "Distance"
  // board. No such column exists on `users`: PostgREST rejected the query, the
  // data came back null, and the whole board rendered "No athletes yet".
  const ranked = await getRankedAthletes()

  return (
    <LeaderboardClient
      byRuns={ranked.slice(0, BOARD_SIZE).map(toPublicRow)}
      totalAthletes={ranked.length}
    />
  )
}
