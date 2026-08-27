import type { Metadata } from 'next'
import LeaderboardClient from './leaderboard-client'
import { getLeaderboardTop, type LeaderboardRow } from '@/lib/leaderboard'
import { DEFAULT_OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from '@/lib/seo'
import { JsonLd } from '@/components/seo/json-ld'
import { graph, breadcrumbNode } from '@/lib/json-ld'
import { PRODUCTION_SITE_URL } from '@/lib/site-url'
import { LeaderboardTools } from '@/components/webmcp/page-tools'
import { getMilestone } from '@/lib/milestones'

// Previously an untyped object with a title only: no description for search
// results, and no openGraph, so it inherited the layout's and every share
// previewed as the homepage. The brand suffix comes from the title template.
export const metadata: Metadata = {
  title: 'Leaderboard — Most Runs Attended',
  description:
    'Who shows up the most. The Stride leaderboard ranks Bengaluru’s athletes by community runs attended — counts update the moment you check in at a run.',
  keywords: ['Stride Run Club leaderboard', 'running leaderboard Bengaluru', 'most runs attended', 'run club rankings'],
  alternates: { canonical: '/leaderboard', types: { 'text/markdown': '/leaderboard.md' } },
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

// 3 hours — keep in lockstep with LEADERBOARD_REVALIDATE in @/lib/leaderboard.
// Long on purpose: the board only changes at check-in, and this cache exists so
// that traffic volume doesn't drive database load.
export const revalidate = 10_800

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
  //
  // Ranking and the LIMIT both happen in Postgres, so this reads BOARD_SIZE rows
  // rather than every athlete.
  const { rows, totalAthletes } = await getLeaderboardTop(BOARD_SIZE)

  // An ItemList of the board. Only athletes who keep their profile public are
  // named here: `profile_public: false` is a member asking not to be linked,
  // and putting them in structured data would republish exactly the identifier
  // they withheld — in the one format built to be copied elsewhere.
  const jsonLd = graph([
    {
      '@type': 'ItemList',
      '@id': `${PRODUCTION_SITE_URL}/leaderboard#list`,
      name: 'Stride Run Club leaderboard',
      description: `Stride athletes ranked by community runs attended, out of ${totalAthletes} in total.`,
      numberOfItems: rows.filter(row => row.profile_public).length,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      itemListElement: rows
        .map((row, index) => ({ row, position: index + 1 }))
        .filter(({ row }) => row.profile_public)
        .map(({ row, position }) => ({
          '@type': 'ListItem',
          position,
          name: row.full_name ?? row.username,
          url: `${PRODUCTION_SITE_URL}/profile/${row.username}`,
        })),
    },
    breadcrumbNode(PRODUCTION_SITE_URL, [{ name: 'Leaderboard', path: '/leaderboard' }]),
  ])

  return (
    <>
      <JsonLd data={jsonLd} />
      {/* WebMCP: the board as a tool, honouring the same privacy rule */}
      <LeaderboardTools
        athletes={rows.map((row, index) => ({
          rank: index + 1,
          name: row.full_name ?? row.username,
          username: row.profile_public ? row.username : null,
          runsCompleted: row.runs_completed,
          tier: getMilestone(row.runs_completed).label,
          url: row.profile_public ? `/profile/${row.username}` : null,
        }))}
        totalAthletes={totalAthletes}
      />
      <LeaderboardClient byRuns={rows} totalAthletes={totalAthletes} />
    </>
  )
}
