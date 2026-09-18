'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Pencil, Trash2, Link2, Check, Calendar, MapPin, Building2, ChevronDown, ChevronUp, Tag, ExternalLink } from 'lucide-react'
import { deleteRaceAction } from '@/lib/actions/admin-races'
import { PendingButton } from '@/components/admin/pending-button'
import { formatDateNumericIST, formatTimeIST, istDayKey } from '@/lib/utils/ist'
import { distanceLabel, sortDistances, type RaceStatus } from '@/types/race'

export type AdminRaceRow = {
  id: string
  name: string
  slug: string
  status: RaceStatus
  raceDate: string
  hasStartTime: boolean
  registrationDeadline: string | null
  city: string
  venue: string | null
  organizer: string | null
  distances: string[]
  registrationUrl: string | null
  couponCode: string | null
  discountPercent: number | null
  thumbUrl: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

type StatusFilter = 'ALL' | RaceStatus

const STATUS_STYLES: Record<RaceStatus, string> = {
  PUBLISHED: 'bg-green-500/15 text-green-400',
  DRAFT:     'bg-white/10 text-white/50',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

const SITE_URL = 'https://www.strideclub.in'
const COPIED_RESET_MS = 2000

function fmtDateTime(d: string | null) {
  if (!d) return '—'
  return `${formatDateNumericIST(d)}, ${formatTimeIST(d)}`
}

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    void navigator.clipboard.writeText(`${SITE_URL}/race-calendar/${slug}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_RESET_MS)
    })
  }
  return (
    <button
      type='button'
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy race link'}
      className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
    >
      {copied ? <Check size={14} /> : <Link2 size={14} />}
    </button>
  )
}

function DeleteModal({ race, onClose }: { race: AdminRaceRow; onClose: () => void }) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4' onClick={onClose}>
      <div className='bg-stride-purple-primary border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl' onClick={e => e.stopPropagation()}>
        <div className='w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mb-4'>
          <Trash2 size={20} className='text-red-400' />
        </div>
        <h2 className='text-white font-bold text-lg mb-1'>Delete race?</h2>
        <p className='text-white/60 text-sm mb-1'>
          <span className='text-white font-medium'>&ldquo;{race.name}&rdquo;</span> will be permanently deleted.
        </p>
        <p className='text-white/40 text-xs mb-6'>Its posters are removed from storage too. This cannot be undone.</p>
        <div className='flex gap-3'>
          <button type='button' onClick={onClose} className='flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 text-sm hover:border-white/30 transition-colors min-h-11'>
            Cancel
          </button>
          <form action={deleteRaceAction.bind(null, race.id)} className='flex-1'>
            <PendingButton
              className='w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 min-h-11'
              pendingLabel='Deleting…'
            >
              Delete
            </PendingButton>
          </form>
        </div>
      </div>
    </div>
  )
}

export function RacesAdminClient({ races, todayKey }: { races: AdminRaceRow[]; todayKey: string }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [deleteTarget, setDeleteTarget] = useState<AdminRaceRow | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const statusCounts = useMemo(() => ({
    ALL:       races.length,
    PUBLISHED: races.filter(r => r.status === 'PUBLISHED').length,
    DRAFT:     races.filter(r => r.status === 'DRAFT').length,
    CANCELLED: races.filter(r => r.status === 'CANCELLED').length,
  }), [races])

  const filtered = useMemo(() => {
    let result = races
    if (statusFilter !== 'ALL') result = result.filter(r => r.status === statusFilter)
    const q = search.trim().toLowerCase()
    if (q) result = result.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.slug.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      r.organizer?.toLowerCase().includes(q)
    )
    return result
  }, [races, search, statusFilter])

  return (
    <>
      {deleteTarget && <DeleteModal race={deleteTarget} onClose={() => setDeleteTarget(null)} />}

      <div className='space-y-4'>
        <div className='flex flex-col sm:flex-row gap-3'>
          <div className='relative flex-1'>
            <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
            <input
              type='text'
              placeholder='Search name, city or organiser…'
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label='Search races'
              className='w-full bg-white/8 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors min-h-11'
            />
          </div>
          <div className='flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0 flex-wrap'>
            {(['ALL', 'PUBLISHED', 'DRAFT', 'CANCELLED'] as StatusFilter[]).map(s => (
              <button
                key={s}
                type='button'
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-h-9 ${
                  statusFilter === s ? 'bg-stride-yellow-accent text-copy-black shadow-sm' : 'text-white/50 hover:text-white'
                }`}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                <span className='ml-1 opacity-60'>({statusCounts[s]})</span>
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div className='bg-white/5 border border-white/10 rounded-2xl p-16 text-center'>
            <p className='text-white/30 text-sm'>
              {search || statusFilter !== 'ALL' ? 'No races match your search.' : 'No races yet. Add the first one.'}
            </p>
          </div>
        )}

        <div className='space-y-2'>
          {filtered.map(race => {
            const isExpanded = expandedId === race.id
            const isPast = istDayKey(race.raceDate) < todayKey
            const dateLabel = `${formatDateNumericIST(race.raceDate)}${race.hasStartTime ? ` · ${formatTimeIST(race.raceDate)}` : ''}`

            return (
              <div key={race.id} className='bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors'>
                <div className='flex items-center gap-4 px-4 py-3.5'>
                  <div className='w-12 h-16 shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10'>
                    {race.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={race.thumbUrl} alt={race.name} className='w-full h-full object-cover' loading='lazy' />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center text-white/15 text-xl'>🏁</div>
                    )}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <p className='text-white font-semibold text-sm line-clamp-1'>{race.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${STATUS_STYLES[race.status]}`}>{race.status}</span>
                      {isPast && race.status === 'PUBLISHED' && (
                        <span className='text-[10px] px-2 py-0.5 rounded-md bg-white/8 text-white/30 shrink-0'>Completed</span>
                      )}
                      {race.registrationUrl && (
                        <span className='flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/8 text-white/50 shrink-0'>
                          <Link2 size={10} aria-hidden='true' /> LINK
                        </span>
                      )}
                      {race.couponCode && (
                        <span className='flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-stride-yellow-accent/15 text-stride-yellow-accent shrink-0'>
                          <Tag size={10} aria-hidden='true' /> COUPON{race.discountPercent ? ` · ${race.discountPercent}% OFF` : ''}
                        </span>
                      )}
                    </div>

                    <div className='flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5'>
                      <span className='flex items-center gap-1 text-white/40 text-xs'>
                        <Calendar size={10} className='shrink-0' />
                        {dateLabel}
                      </span>
                      <span className='flex items-center gap-1 text-white/40 text-xs min-w-0 max-w-45'>
                        <MapPin size={10} className='shrink-0' />
                        <span className='truncate'>{race.city}</span>
                      </span>
                      <span className='text-white/40 text-xs truncate max-w-60'>
                        {sortDistances(race.distances).map(distanceLabel).join(' · ')}
                      </span>
                    </div>
                  </div>

                  <div className='hidden sm:flex items-center gap-1 shrink-0'>
                    <Link href={`/admin/race-calendar/${race.id}/edit`} title='Edit race' className='p-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-stride-yellow-accent transition-colors'>
                      <Pencil size={14} />
                    </Link>
                    <CopyLinkButton slug={race.slug} />
                    <button type='button' onClick={() => setDeleteTarget(race)} title='Delete race' className='p-2 rounded-lg bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-colors'>
                      <Trash2 size={14} />
                    </button>
                    <button type='button' onClick={() => setExpandedId(isExpanded ? null : race.id)} className='p-2 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors' aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  <button type='button' onClick={() => setExpandedId(isExpanded ? null : race.id)} className='sm:hidden p-2 rounded-lg text-white/25 hover:text-white/60 transition-colors shrink-0 min-h-11 min-w-11' aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                <div className='sm:hidden flex items-center justify-end gap-1 px-4 pb-3 border-t border-white/5 pt-2.5 mt-0.5'>
                  <Link href={`/admin/race-calendar/${race.id}/edit`} title='Edit' className='p-2 rounded-lg bg-white/5 text-white/40 hover:text-stride-yellow-accent transition-colors'>
                    <Pencil size={13} />
                  </Link>
                  <CopyLinkButton slug={race.slug} />
                  <button type='button' onClick={() => setDeleteTarget(race)} title='Delete' className='p-2 rounded-lg bg-white/5 text-white/40 hover:text-red-400 transition-colors'>
                    <Trash2 size={13} />
                  </button>
                </div>

                {isExpanded && (
                  <div className='border-t border-white/8 px-4 py-4 bg-white/[0.02] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'>
                    <div>
                      <p className='text-white/25 font-mono uppercase tracking-widest mb-1.5'>Slug</p>
                      <p className='text-white/60 font-mono'>{race.slug}</p>
                    </div>
                    <div>
                      <p className='text-white/25 font-mono uppercase tracking-widest mb-1.5'>Venue</p>
                      <p className='text-white/60'>{[race.venue, race.city].filter(Boolean).join(', ')}</p>
                    </div>
                    {race.organizer && (
                      <div>
                        <p className='text-white/25 font-mono uppercase tracking-widest mb-1.5'>Organiser</p>
                        <p className='text-white/60 flex items-center gap-1.5'><Building2 size={11} /> {race.organizer}</p>
                      </div>
                    )}
                    <div>
                      <p className='text-white/25 font-mono uppercase tracking-widest mb-1.5'>Registration deadline</p>
                      <p className='text-white/60'>{race.registrationDeadline ? `${fmtDateTime(race.registrationDeadline)} IST` : '—'}</p>
                    </div>
                    {race.registrationUrl && (
                      <div className='sm:col-span-2'>
                        <p className='text-white/25 font-mono uppercase tracking-widest mb-1.5'>Registration link</p>
                        <a href={race.registrationUrl} target='_blank' rel='noopener noreferrer nofollow' className='text-stride-yellow-accent/80 hover:text-stride-yellow-accent break-all inline-flex items-center gap-1'>
                          {race.registrationUrl} <ExternalLink size={10} className='shrink-0' />
                        </a>
                      </div>
                    )}
                    {race.couponCode && (
                      <div>
                        <p className='text-white/25 font-mono uppercase tracking-widest mb-1.5'>Coupon code</p>
                        <p className='text-white font-mono font-bold'>
                          {race.couponCode}
                          {race.discountPercent && <span className='ml-2 text-stride-yellow-accent text-xs font-sans'>{race.discountPercent}% off</span>}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className='text-white/25 font-mono uppercase tracking-widest mb-1.5'>Shareable link</p>
                      <p className='text-white/40 font-mono break-all'>{SITE_URL}/race-calendar/{race.slug}</p>
                    </div>
                    <div>
                      <p className='text-white/25 font-mono uppercase tracking-widest mb-1.5'>Created by</p>
                      <p className='text-white/60'>{race.createdBy ?? '—'}</p>
                      <p className='text-white/30 mt-0.5'>{fmtDateTime(race.createdAt)}</p>
                    </div>
                    <div>
                      <p className='text-white/25 font-mono uppercase tracking-widest mb-1.5'>Last modified by</p>
                      <p className='text-white/60'>{race.updatedBy ?? '—'}</p>
                      <p className='text-white/30 mt-0.5'>{fmtDateTime(race.updatedAt)}</p>
                    </div>
                    <div className='sm:col-span-2 flex gap-2 pt-1'>
                      <Link href={`/admin/race-calendar/${race.id}/edit`} className='flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stride-yellow-accent/10 text-stride-yellow-accent text-xs font-medium hover:bg-stride-yellow-accent/20 transition-colors min-h-9'>
                        <Pencil size={11} /> Edit race
                      </Link>
                      <a href={`/race-calendar/${race.slug}`} target='_blank' rel='noopener noreferrer' className='flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-white/50 text-xs font-medium hover:bg-white/10 hover:text-white transition-colors min-h-9'>
                        <Link2 size={11} /> View public page
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
