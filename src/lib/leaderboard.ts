import { revalidatePath } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'

// Single source of truth for leaderboard ordering, shared by the board itself
// and the "your position" endpoint so the two can never disagree.

export const LEADERBOARD_PATH = '/leaderboard'

/**
 * Purges the ISR cache behind the leaderboard. Any write that changes a column
 * the board renders — `profile_public`, `full_name`, `avatar_url`,
 * `runs_completed` — must call this, or the page keeps serving its pre-write
 * snapshot for the rest of its revalidate window. That window is why a profile
 * switched to public still rendered as private (unlinked, initials instead of a
 * photo, no tier) minutes after the toggle.
 *
 * Route handlers and server actions only — Next.js throws if this runs during a
 * render pass.
 */
export function revalidateLeaderboard(): void {
  revalidatePath(LEADERBOARD_PATH)
}

export type LeaderboardRow = {
  username: string
  full_name: string | null
  avatar_url: string | null
  runs_completed: number
  /** When false the entry shows a name and run count only — no photo, no link. */
  profile_public: boolean
}

type RawRow = LeaderboardRow & { id: string }

/**
 * Ranking rule, as stated on the page: most runs first, and when two athletes
 * have the same count the one who got there first ranks higher. "Got there
 * first" is the timestamp of their most recent confirmed check-in — the run that
 * took them to their current total. Athletes with no check-ins (0 runs) sort
 * last among their tie, then by username so the order is at least stable.
 */
function compare(
  a: RawRow,
  b: RawRow,
  reachedAt: Map<string, string>
): number {
  if (a.runs_completed !== b.runs_completed) return b.runs_completed - a.runs_completed

  const at = reachedAt.get(a.id)
  const bt = reachedAt.get(b.id)
  if (at && bt) return at.localeCompare(bt)   // earlier timestamp ranks higher
  if (at) return -1
  if (bt) return 1

  return a.username.localeCompare(b.username)
}

/**
 * Every athlete in ranked order. Reads the whole users table plus confirmed
 * check-ins — the tie-break needs both, and a `LIMIT` before sorting would pick
 * the wrong rows. Callers slice after ranking.
 */
export async function getRankedAthletes(): Promise<RawRow[]> {
  const [{ data: users }, { data: checkIns }] = await Promise.all([
    adminClient
      .from('users')
      .select('id, username, full_name, avatar_url, profile_public, runs_completed'),
    adminClient
      .from('event_registrations')
      .select('user_id, checked_in_at')
      .eq('status', 'CONFIRMED')
      .not('checked_in_at', 'is', null),
  ])

  // Latest confirmed check-in per athlete = when they reached their current total.
  const reachedAt = new Map<string, string>()
  for (const row of checkIns ?? []) {
    const at = row.checked_in_at as string | null
    if (!at) continue
    const current = reachedAt.get(row.user_id)
    if (!current || at > current) reachedAt.set(row.user_id, at)
  }

  return ((users ?? []) as RawRow[]).sort((a, b) => compare(a, b, reachedAt))
}

/**
 * Projects to exactly the public fields. Listed explicitly rather than spreading
 * minus `id`, so a new internal column can never leak to the client by default.
 */
export function toPublicRow(row: RawRow): LeaderboardRow {
  return {
    username: row.username,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    runs_completed: row.runs_completed,
    profile_public: row.profile_public,
  }
}
