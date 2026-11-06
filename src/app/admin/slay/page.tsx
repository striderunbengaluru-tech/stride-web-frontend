import Link from 'next/link'
import clsx from 'clsx'
import { adminClient } from '@/lib/supabase/admin'
import { requireFullAdmin } from '@/lib/auth/admin-access'
import { SlayApprovalsClient, type SlayInviteRow } from '@/components/admin/slay-approvals-client'

export const metadata = { title: 'Slay approvals — Admin' }

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
type InviteStatus = (typeof STATUSES)[number]

const STATUS_LABELS: Record<InviteStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

const PAGE_SIZE = 25

/** PostgREST's "relation does not exist" — the migration hasn't been run yet. */
const TABLE_MISSING = 'PGRST205'

type PageProps = { searchParams: Promise<{ status?: string; page?: string }> }

function parseStatus(value: string | undefined): InviteStatus {
  return STATUSES.find((s) => s === value) ?? 'PENDING'
}

function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

async function countByStatus(status: InviteStatus): Promise<number> {
  const { count } = await adminClient
    .from('slay_invites')
    .select('id', { count: 'exact', head: true })
    .eq('status', status)
  return count ?? 0
}

/**
 * Applications from the /join-slay form. Approving one emails the applicant the
 * Slay WhatsApp community link; rejecting sends nothing. One status at a time,
 * paged: pending oldest-first (a queue, first come first served), reviewed
 * newest-first.
 */
export default async function AdminSlayApprovalsPage({ searchParams }: PageProps) {
  // ADMIN only. A LEAD reaching this route is redirected to check-in.
  await requireFullAdmin()

  const params = await searchParams
  const status = parseStatus(params.status)
  const page = parsePage(params.page)
  const from = (page - 1) * PAGE_SIZE

  const [{ data, error, count }, ...counts] = await Promise.all([
    adminClient
      .from('slay_invites')
      .select('id, full_name, email, whatsapp, instagram, reason, status, created_at, reviewed_at, reviewed_by', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: status === 'PENDING' })
      .range(from, from + PAGE_SIZE - 1),
    ...STATUSES.map(countByStatus),
  ])

  if (error?.code === TABLE_MISSING) {
    return (
      <div className='mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 text-white'>
        <h1 className='text-2xl font-bold'>Slay approvals</h1>
        <p className='mt-3 text-white/70'>
          The applications table doesn&apos;t exist yet. Run{' '}
          <code className='font-mono text-stride-yellow-accent'>supabase-migrations/2026-11-07-slay-invites.sql</code>{' '}
          in the Supabase SQL Editor, then reload this page.
        </p>
      </div>
    )
  }
  if (error) console.error('[admin/slay] loading applications failed:', error.message)

  const rows: SlayInviteRow[] = (data ?? []).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    whatsapp: r.whatsapp,
    instagram: r.instagram,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
  }))
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const href = (s: InviteStatus, p = 1) => `/admin/slay?status=${s}${p > 1 ? `&page=${p}` : ''}`

  return (
    <div className='mx-auto max-w-6xl'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-white'>Slay approvals</h1>
        <p className='mt-1 text-sm text-white/40'>
          Applications from the Slay Run Club page. Approving one emails the applicant the WhatsApp community link.
        </p>
      </div>

      <div className='mb-6 grid grid-cols-3 gap-3'>
        {STATUSES.map((s, i) => (
          <Link
            key={s}
            href={href(s)}
            aria-current={s === status ? 'page' : undefined}
            className={clsx(
              'min-h-11 rounded-2xl border p-4 transition-colors',
              s === status ? 'border-stride-yellow-accent/60 bg-white/10' : 'border-white/10 bg-white/5 hover:border-stride-yellow-accent/50',
            )}
          >
            <p className='text-xs text-white/40'>{STATUS_LABELS[s]}</p>
            <p className='mt-1 text-2xl font-bold text-stride-yellow-accent'>{counts[i]}</p>
          </Link>
        ))}
      </div>

      <SlayApprovalsClient rows={rows} status={status} />

      {totalPages > 1 && (
        <nav aria-label='Pages' className='mt-6 flex items-center justify-between text-sm text-white/60'>
          {page > 1 ? (
            <Link href={href(status, page - 1)} className='inline-flex min-h-11 items-center hover:text-stride-yellow-accent'>← Previous</Link>
          ) : <span />}
          <span>Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link href={href(status, page + 1)} className='inline-flex min-h-11 items-center hover:text-stride-yellow-accent'>Next →</Link>
          ) : <span />}
        </nav>
      )}
    </div>
  )
}
