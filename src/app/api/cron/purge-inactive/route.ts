import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { hardDeleteUser } from '@/lib/account/hard-delete'

// DPDP data-retention limit: accounts with no activity for 3 consecutive
// years are erased automatically. Activity = any of: signing in, updating the
// profile (users.updated_at also bumps on check-ins via runs_completed), or
// registering for an event. ADMIN accounts are never auto-deleted.
//
// Triggered by Vercel Cron (vercel.json) on the 1st of every month, 03:00 IST.
// Vercel attaches `Authorization: Bearer <CRON_SECRET>` automatically — the
// env var must be named exactly CRON_SECRET for that (why it doesn't carry
// the STRIDE_ prefix).

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const INACTIVITY_YEARS = 3
// Bounded work per run so the function stays well inside maxDuration; any
// backlog drains on subsequent monthly runs.
const MAX_DELETES_PER_RUN = 25
const LIST_USERS_PER_PAGE = 1000
const IN_CHUNK_SIZE = 200

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[purge-inactive] CRON_SECRET is not configured — refusing to run')
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoffDate = new Date()
  cutoffDate.setFullYear(cutoffDate.getFullYear() - INACTIVITY_YEARS)
  const cutoff = cutoffDate.toISOString()

  // ── 1. Enumerate auth users; candidates have not signed in since the cutoff
  //       (accounts that never signed in are judged by creation date).
  const candidateIds: string[] = []
  let scanned = 0
  for (let page = 1; ; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: LIST_USERS_PER_PAGE })
    if (error) {
      console.error('[purge-inactive] listUsers failed', { page, error })
      return NextResponse.json({ error: 'Failed to enumerate users' }, { status: 500 })
    }
    const users = data?.users ?? []
    scanned += users.length
    for (const authUser of users) {
      const lastSeen = authUser.last_sign_in_at ?? authUser.created_at
      if (lastSeen && lastSeen < cutoff) candidateIds.push(authUser.id)
    }
    if (users.length < LIST_USERS_PER_PAGE) break
  }

  // ── 2. Drop anyone with recent app activity, and never touch admins.
  let skippedAdmins = 0
  const active = new Set<string>()
  const admins = new Set<string>()

  for (const ids of chunk(candidateIds, IN_CHUNK_SIZE)) {
    const [{ data: userRows, error: usersError }, { data: recentRegs, error: regsError }] = await Promise.all([
      adminClient.from('users').select('id, role, updated_at').in('id', ids),
      adminClient.from('event_registrations').select('user_id').in('user_id', ids).gte('created_at', cutoff),
    ])
    if (usersError || regsError) {
      console.error('[purge-inactive] exclusion queries failed', { usersError, regsError })
      return NextResponse.json({ error: 'Failed to evaluate activity' }, { status: 500 })
    }
    for (const row of userRows ?? []) {
      if (row.role === 'ADMIN') admins.add(row.id)
      if (row.updated_at && row.updated_at >= cutoff) active.add(row.id)
    }
    for (const reg of recentRegs ?? []) active.add(reg.user_id)
  }

  skippedAdmins = candidateIds.filter(id => admins.has(id)).length
  const toDelete = candidateIds
    .filter(id => !admins.has(id) && !active.has(id))
    .slice(0, MAX_DELETES_PER_RUN)

  // ── 3. Erase sequentially — bounded load, per-user logs.
  const deleted: string[] = []
  const errors: string[] = []
  for (const userId of toDelete) {
    const result = await hardDeleteUser(userId)
    if (result.ok) deleted.push(userId)
    else errors.push(`${userId}: ${result.fatalError ?? 'unknown error'}`)
  }

  const summary = {
    cutoff,
    scanned,
    candidates: candidateIds.length,
    skippedAdmins,
    deleted: deleted.length,
    deletedIds: deleted,
    errors,
  }
  console.log('[purge-inactive]', JSON.stringify(summary))
  return NextResponse.json(summary)
}
