'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { InstagramIcon } from '@/components/ui/brand-icons'
import { approveSlayInviteAction, rejectSlayInviteAction } from '@/lib/actions/admin-slay'
import { formatDateTimeIST } from '@/lib/utils/ist'

export type SlayInviteRow = {
  id: string
  fullName: string
  email: string
  whatsapp: string
  instagram: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  reviewedAt: string | null
  reviewedBy: string | null
}

type Decision = 'approve' | 'reject'

function ApplicationCard({ row }: { row: SlayInviteRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<Decision | null>(null)
  const [error, setError] = useState<string | null>(null)

  const decide = (decision: Decision) => {
    if (decision === 'reject' && !window.confirm(`Reject ${row.fullName}'s application? No email is sent.`)) return
    setError(null)
    setBusy(decision)
    startTransition(async () => {
      const result = decision === 'approve'
        ? await approveSlayInviteAction(row.id)
        : await rejectSlayInviteAction(row.id)
      if ('error' in result) setError(result.error)
      else router.refresh()
      setBusy(null)
    })
  }

  return (
    <li className='rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-colors hover:border-stride-yellow-accent/50'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div className='min-w-0 flex-1'>
          <h2 className='text-lg font-semibold text-white'>{row.fullName}</h2>
          <dl className='mt-2 grid gap-x-6 gap-y-1 text-sm text-white/70 sm:grid-cols-3'>
            <div className='min-w-0'>
              <dt className='sr-only'>Email</dt>
              <dd className='truncate'>
                <a href={`mailto:${row.email}`} className='hover:text-stride-yellow-accent'>{row.email}</a>
              </dd>
            </div>
            <div>
              <dt className='sr-only'>WhatsApp</dt>
              <dd>
                <a href={`https://wa.me/91${row.whatsapp}`} target='_blank' rel='noopener noreferrer' className='hover:text-stride-yellow-accent'>
                  +91 {row.whatsapp}
                </a>
              </dd>
            </div>
            <div>
              <dt className='sr-only'>Instagram</dt>
              <dd>
                <a
                  href={`https://www.instagram.com/${row.instagram}/`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1.5 hover:text-stride-yellow-accent'
                >
                  <InstagramIcon className='size-3.5' />@{row.instagram}
                </a>
              </dd>
            </div>
          </dl>
          <p className='mt-3 whitespace-pre-line text-sm leading-relaxed text-white/85'>{row.reason}</p>
          <p className='mt-3 text-xs text-white/40'>
            Applied {formatDateTimeIST(row.createdAt)}
            {row.reviewedAt && ` · ${row.status === 'APPROVED' ? 'Approved' : 'Rejected'} ${formatDateTimeIST(row.reviewedAt)}${row.reviewedBy ? ` by ${row.reviewedBy}` : ''}`}
          </p>
          {error && <p role='alert' className='mt-3 text-sm font-medium text-red-300'>{error}</p>}
        </div>

        {row.status === 'PENDING' && (
          <div className='flex shrink-0 gap-2'>
            <button
              type='button'
              disabled={pending}
              onClick={() => decide('approve')}
              className='inline-flex min-h-11 items-center gap-1.5 rounded-md bg-stride-yellow-accent px-4 text-sm font-semibold text-copy-black transition-colors hover:bg-stride-yellow-accent/90 disabled:cursor-wait disabled:opacity-60'
            >
              <Check className='size-4' aria-hidden />
              {busy === 'approve' ? 'Sending invite…' : 'Approve & email invite'}
            </button>
            <button
              type='button'
              disabled={pending}
              onClick={() => decide('reject')}
              className='inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:border-red-300 hover:text-red-300 disabled:cursor-wait disabled:opacity-60'
            >
              <X className='size-4' aria-hidden />
              {busy === 'reject' ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

const EMPTY_COPY: Record<SlayInviteRow['status'], string> = {
  PENDING: 'No applications waiting. New ones from the Slay page land here.',
  APPROVED: 'No approved applications yet.',
  REJECTED: 'No rejected applications.',
}

export function SlayApprovalsClient({ rows, status }: { rows: SlayInviteRow[]; status: SlayInviteRow['status'] }) {
  if (rows.length === 0) {
    return <p className='rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/60'>{EMPTY_COPY[status]}</p>
  }
  return (
    <ul className='flex flex-col gap-3'>
      {rows.map((row) => <ApplicationCard key={row.id} row={row} />)}
    </ul>
  )
}
