'use client'

import { useState, useMemo } from 'react'
import { Search, Pencil, Trash2, Link2, Check, Calendar, MapPin, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { deleteEventAction } from '@/lib/actions/admin'
import { PendingButton } from '@/components/admin/pending-button'

export type AdminEventRow = {
  id: string
  name: string
  subtitle: string | null
  slug: string
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED'
  eventDate: string | null
  endDate: string | null
  location: string | null
  pricePaise: number
  capacity: number | null
  confirmedCount: number
  thumbUrl: string | null
  createdAt: string
}

type StatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT' | 'CANCELLED'

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: 'bg-green-500/15 text-green-400',
  DRAFT:     'bg-white/10 text-white/50',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

const SITE_URL = 'https://www.strideclub.in'

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function CapacityBar({ confirmed, capacity }: { confirmed: number; capacity: number | null }) {
  if (!capacity) return <span className='text-white/30 text-xs tabular-nums'>{confirmed} registered</span>
  const pct = Math.min(100, Math.round((confirmed / capacity) * 100))
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-stride-yellow-accent' : 'bg-green-500'
  return (
    <div className='flex items-center gap-2'>
      <div className='w-16 bg-white/10 rounded-full h-1.5 overflow-hidden'>
        <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className='text-white/50 text-xs tabular-nums'>{confirmed}/{capacity}</span>
    </div>
  )
}

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    void navigator.clipboard.writeText(`${SITE_URL}/events/${slug}/`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy event link'}
      className={`p-2 rounded-lg transition-colors ${
        copied
          ? 'bg-green-500/20 text-green-400'
          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
      }`}
    >
      {copied ? <Check size={14} /> : <Link2 size={14} />}
    </button>
  )
}

function DeleteModal({ event, onClose }: { event: AdminEventRow; onClose: () => void }) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4' onClick={onClose}>
      <div
        className='bg-stride-purple-primary border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl'
        onClick={e => e.stopPropagation()}
      >
        <div className='w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mb-4'>
          <Trash2 size={20} className='text-red-400' />
        </div>
        <h2 className='text-white font-bold text-lg mb-1'>Delete event?</h2>
        <p className='text-white/60 text-sm mb-1'>
          <span className='text-white font-medium'>"{event.name}"</span> will be permanently deleted.
        </p>
        <p className='text-white/40 text-xs mb-6'>
          All content and images related to this event will be deleted. This cannot be undone.
        </p>
        <div className='flex gap-3'>
          <button
            onClick={onClose}
            className='flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 text-sm hover:border-white/30 transition-colors'
          >
            Cancel
          </button>
          <form action={deleteEventAction.bind(null, event.id)} className='flex-1'>
            <PendingButton
              className='w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-60'
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

export function EventsAdminClient({ events }: { events: AdminEventRow[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [deleteTarget, setDeleteTarget] = useState<AdminEventRow | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const statusCounts = useMemo(() => ({
    ALL:       events.length,
    PUBLISHED: events.filter(e => e.status === 'PUBLISHED').length,
    DRAFT:     events.filter(e => e.status === 'DRAFT').length,
    CANCELLED: events.filter(e => e.status === 'CANCELLED').length,
  }), [events])

  const filtered = useMemo(() => {
    let result = events
    if (statusFilter !== 'ALL') result = result.filter(e => e.status === statusFilter)
    const q = search.trim().toLowerCase()
    if (q) result = result.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.slug.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q)
    )
    return result
  }, [events, search, statusFilter])

  return (
    <>
      {deleteTarget && (
        <DeleteModal event={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}

      <div className='space-y-4'>
        {/* Search + status filter */}
        <div className='flex flex-col sm:flex-row gap-3'>
          <div className='relative flex-1'>
            <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
            <input
              type='text'
              placeholder='Search name, slug, or location…'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full bg-white/8 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
            />
          </div>
          <div className='flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0 flex-wrap'>
            {(['ALL', 'PUBLISHED', 'DRAFT', 'CANCELLED'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === s
                    ? 'bg-stride-yellow-accent text-copy-black shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                <span className='ml-1 opacity-60'>({statusCounts[s]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className='bg-white/5 border border-white/10 rounded-2xl p-16 text-center'>
            <p className='text-white/30 text-sm'>
              {search || statusFilter !== 'ALL' ? 'No events match your search.' : 'No events yet. Create your first event.'}
            </p>
          </div>
        )}

        {/* Event cards */}
        <div className='space-y-2'>
          {filtered.map(event => {
            const isExpanded = expandedId === event.id
            const isPast = event.eventDate ? new Date(event.eventDate) < new Date() : false

            return (
              <div
                key={event.id}
                className='bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors'
              >
                {/* Main row */}
                <div className='flex items-center gap-4 px-4 py-3.5'>

                  {/* Thumbnail */}
                  <div className='w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10'>
                    {event.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.thumbUrl} alt={event.name} className='w-full h-full object-cover' loading='lazy' />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center text-white/15 text-xl'>🏃</div>
                    )}
                  </div>

                  {/* Core info */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <p className='text-white font-semibold text-sm line-clamp-1'>{event.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${STATUS_STYLES[event.status]}`}>
                        {event.status}
                      </span>
                      {isPast && event.status === 'PUBLISHED' && (
                        <span className='text-[10px] px-2 py-0.5 rounded-md bg-white/8 text-white/30 shrink-0'>Completed</span>
                      )}
                    </div>
                    {event.subtitle && (
                      <p className='text-white/35 text-xs mt-0.5 line-clamp-1'>{event.subtitle}</p>
                    )}

                    {/* Meta pills */}
                    <div className='flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5'>
                      {event.eventDate && (
                        <span className='flex items-center gap-1 text-white/40 text-xs'>
                          <Calendar size={10} />
                          {fmtDate(event.eventDate)}{fmtTime(event.eventDate) ? ` · ${fmtTime(event.eventDate)}` : ''}
                        </span>
                      )}
                      {event.location && (
                        <span className='flex items-center gap-1 text-white/40 text-xs truncate max-w-[180px]'>
                          <MapPin size={10} />
                          {event.location}
                        </span>
                      )}
                      <span className='text-white/40 text-xs'>
                        {event.pricePaise === 0 ? (
                          <span className='text-green-400'>Free</span>
                        ) : (
                          `₹${(event.pricePaise / 100).toLocaleString('en-IN')}`
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Capacity — desktop only */}
                  <div className='hidden sm:flex flex-col gap-1 shrink-0'>
                    <div className='flex items-center gap-1 text-white/40 text-xs mb-0.5'>
                      <Users size={10} />
                      <span>Registrations</span>
                    </div>
                    <CapacityBar confirmed={event.confirmedCount} capacity={event.capacity} />
                  </div>

                  {/* Desktop actions */}
                  <div className='hidden sm:flex items-center gap-1 shrink-0'>
                    <a
                      href={`/admin/events/${event.id}/edit`}
                      title='Edit event'
                      className='p-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-stride-yellow-accent transition-colors'
                    >
                      <Pencil size={14} />
                    </a>
                    <CopyLinkButton slug={event.slug} />
                    <button
                      onClick={() => setDeleteTarget(event)}
                      title='Delete event'
                      className='p-2 rounded-lg bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-colors'
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                      className='p-2 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors'
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Mobile: chevron only */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    className='sm:hidden p-2 rounded-lg text-white/25 hover:text-white/60 transition-colors shrink-0'
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Mobile: capacity + actions strip */}
                <div className='sm:hidden flex items-center gap-2 px-4 pb-3 border-t border-white/5 pt-2.5 mt-0.5'>
                  <div className='flex items-center gap-1.5 flex-1'>
                    <Users size={10} className='text-white/30 shrink-0' />
                    <CapacityBar confirmed={event.confirmedCount} capacity={event.capacity} />
                  </div>
                  <div className='flex items-center gap-1 shrink-0'>
                    <a href={`/admin/events/${event.id}/edit`} title='Edit' className='p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-stride-yellow-accent transition-colors'>
                      <Pencil size={13} />
                    </a>
                    <CopyLinkButton slug={event.slug} />
                    <button onClick={() => setDeleteTarget(event)} title='Delete' className='p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-red-400 transition-colors'>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className='border-t border-white/8 px-4 py-4 bg-white/[0.02] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'>
                    <div>
                      <p className='text-white/25 uppercase tracking-widest mb-1.5'>Slug</p>
                      <p className='text-white/60 font-mono'>{event.slug}</p>
                    </div>
                    {event.eventDate && (
                      <div>
                        <p className='text-white/25 uppercase tracking-widest mb-1.5'>Date & Time</p>
                        <p className='text-white/60'>{fmtDate(event.eventDate)}{fmtTime(event.eventDate) ? `, ${fmtTime(event.eventDate)}` : ''}</p>
                        {event.endDate && <p className='text-white/30 mt-0.5'>Ends {fmtTime(event.endDate)}</p>}
                      </div>
                    )}
                    {event.location && (
                      <div>
                        <p className='text-white/25 uppercase tracking-widest mb-1.5'>Location</p>
                        <p className='text-white/60'>{event.location}</p>
                      </div>
                    )}
                    <div>
                      <p className='text-white/25 uppercase tracking-widest mb-1.5'>Shareable link</p>
                      <p className='text-white/40 font-mono break-all'>{SITE_URL}/events/{event.slug}/</p>
                    </div>
                    <div>
                      <p className='text-white/25 uppercase tracking-widest mb-1.5'>Created</p>
                      <p className='text-white/40'>{fmtDate(event.createdAt)}</p>
                    </div>
                    <div className='sm:col-span-2 flex gap-2 pt-1'>
                      <a
                        href={`/admin/events/${event.id}/edit`}
                        className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stride-yellow-accent/10 text-stride-yellow-accent text-xs font-medium hover:bg-stride-yellow-accent/20 transition-colors'
                      >
                        <Pencil size={11} /> Edit event
                      </a>
                      <a
                        href={`/events/${event.slug}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs font-medium hover:bg-white/10 hover:text-white transition-colors'
                      >
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
