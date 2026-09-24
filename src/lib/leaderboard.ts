import { cache } from 'react'
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'
import { getYtdDistanceByUsername } from '@/lib/strava/data'

// Single source of truth for leaderboard reads, shared by the board itself and
// the "your position" endpoint so the two can never disagree.
//
// The ranking itself lives in Postgres (`leaderboard_top` /
// `leaderboard_rank_for`, added in
// supabase-migrations/2026-07-30-event-packages-and-leaderboard.sql). It used to
// be a JS sort over the whole users table plus every confirmed check-in, with
// only the top 50 ever rendered — so one board render moved ~200 rows to display
// 50, and /api/leaderboard/me pulled the entire ranking just to find one array
// index. Ranking in SQL makes a board refresh cost 50 rows and a rank lookup
// cost one.

export const LEADERBOARD_PATH = '/leaderboard'
export const LEADERBOARD_TAG = 'leaderboard'

// 3 hours. Deliberately long: run counts only change at check-in, and the point
// of this cache is that traffic volume no longer drives database load. Keep in
// lockstep with `export const revalidate` in app/leaderboard/page.tsx, or the
// cached reads and the rendered page can drift by more than one window.
const LEADERBOARD_REVALIDATE = 10_800

/**
 * Purges everything behind the leaderboard: the tagged reads and the page's ISR
 * entry.
 *
 * Called only for writes whose staleness is *confusing* rather than merely
 * out-of-date. A profile switched to public but still rendering as private
 * (unlinked, initials instead of a photo, no tier) reads as a bug; a run count
 * that lags by an hour does not. So profile edits purge and check-ins do not —
 * check-ins arrive in bursts on run days, which is exactly when a purge per
 * write would hammer the database. They surface at the next window instead.
 *
 * Route handlers and server actions only — Next.js throws if this runs during a
 * render pass.
 */
export function revalidateLeaderboard(): void {
  revalidateTag(LEADERBOARD_TAG, { expire: 0 })
  revalidatePath(LEADERBOARD_PATH)
}

export type LeaderboardRow = {
  username: string
  full_name: string | null
  avatar_url: string | null
  runs_completed: number
  /** When false the entry shows a name and run count only — no photo, no link. */
  profile_public: boolean
  /**
   * Metres run this calendar year, synced from Strava — shown beside the name,
   * never ranked on. Null when the athlete hasn't connected Strava (or Strava
   * data isn't shown publicly; see STRAVA_PUBLIC_DISPLAY).
   */
  ytd_distance_m: number | null
}

/** A `leaderboard_top` row: the public fields plus the total, repeated per row. */
type TopRow = Omit<LeaderboardRow, 'ytd_distance_m'> & { total_athletes: number }

export type LeaderboardBoard = {
  rows: LeaderboardRow[]
  totalAthletes: number
}

export type ViewerRank = {
  rank: number
  totalAthletes: number
  runsCompleted: number
  username: string
  fullName: string | null
  avatarUrl: string | null
  ytdDistanceM: number | null
}

/**
 * The top `limit` athletes in ranked order, plus the total number of athletes.
 *
 * Ranking rule, as stated on the page: most runs first, and when two athletes
 * have the same count the one who got there first ranks higher — "got there
 * first" being their most recent confirmed check-in, the run that took them to
 * their current total. Athletes with no check-ins sort last within their tie,
 * then by username so the order is stable. All of that now lives in
 * `leaderboard_top`; changing the rule means changing the SQL.
 *
 * Two cache layers, matching the events reads in @/lib/data/events:
 * - `unstable_cache` makes this a tagged cross-request read, so the board is
 *   rebuilt ~8×/day rather than once per expiry.
 * - React `cache()` dedupes within a single request.
 *
 * The cached value is the same for everyone — the board has no viewer in it — so
 * there's nothing per-user to key on.
 */
export const getLeaderboardTop = cache((limit: number): Promise<LeaderboardBoard> =>
  unstable_cache(
    async () => {
      const { data, error } = await adminClient.rpc('leaderboard_top', { p_limit: limit })

      if (error) {
        console.error('[leaderboard] leaderboard_top failed', error)
        return { rows: [], totalAthletes: 0 }
      }

      const rows = (data ?? []) as TopRow[]
      // Strava km for the athletes on this page of the board — one extra query,
      // inside the same cache entry, so the board still costs ~8 reads a day.
      const ytdByUsername = await getYtdDistanceByUsername(rows.map(row => row.username))
      return {
        // Projected field by field rather than spread-minus-total, so a column
        // added to the SQL function can never reach the client by default.
        rows: rows.map(row => ({
          username: row.username,
          full_name: row.full_name,
          avatar_url: row.avatar_url,
          runs_completed: row.runs_completed,
          profile_public: row.profile_public,
          ytd_distance_m: ytdByUsername.get(row.username) ?? null,
        })),
        // Repeated on every row by the window function; an empty board has none.
        totalAthletes: rows[0]?.total_athletes ?? 0,
      }
    },
    ['leaderboard-top', String(limit)],
    { tags: [LEADERBOARD_TAG], revalidate: LEADERBOARD_REVALIDATE }
  )()
)

/**
 * Where one athlete sits in that same ranking. Keyed per user and cached on the
 * same window as the board, so the two always tell the same story.
 *
 * Returns null when the caller has no `users` row yet.
 */
export const getViewerRank = cache((userId: string): Promise<ViewerRank | null> =>
  unstable_cache(
    async () => {
      const { data, error } = await adminClient.rpc('leaderboard_rank_for', {
        p_user_id: userId,
      })

      if (error) {
        console.error('[leaderboard] leaderboard_rank_for failed', error)
        return null
      }

      const row = (data ?? [])[0]
      if (!row) return null

      const ytdByUsername = await getYtdDistanceByUsername([row.username])

      // rank/total come back as bigint, which PostgREST serialises as a string.
      return {
        rank: Number(row.rank),
        totalAthletes: Number(row.total_athletes),
        runsCompleted: row.runs_completed,
        username: row.username,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        ytdDistanceM: ytdByUsername.get(row.username) ?? null,
      }
    },
    ['leaderboard-rank', userId],
    { tags: [LEADERBOARD_TAG], revalidate: LEADERBOARD_REVALIDATE }
  )()
)

/** GET /api/leaderboard/me — the signed-in viewer's own place on the board. */
export type ViewerStanding = {
  signedIn: boolean
  runs?: ViewerRank | null
}
