'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ChevronDown, ChevronUp, Search, CheckCircle, Download, Loader2, Phone, AlertCircle, MapPin,
  Cake, UserRound, Mail, CalendarPlus, Ticket, Check, X, ClipboardList, Tag,
} from 'lucide-react'
import { approveRegistrationsAction, rejectRegistrationsAction } from '@/lib/actions/admin'
import type { EventWithAttendees, Attendee } from '@/types/admin-registrations'
import type { AdditionalField, CustomResponses } from '@/types/event'
import { RunnerTagBadge } from '@/components/ui/runner-tag-badge'
import { TierBadge } from '@/components/ui/tier-badge'
import { Avatar, Fact, GENDER_LABEL, telHref, mailtoHref } from '@/components/admin/user-facts'
import { getMilestone } from '@/lib/milestones'
import { formatDateNumericIST, formatTimeIST, formatDateTimeIST } from '@/lib/utils/ist'
import { priceLabel as priceOf } from '@/lib/utils/money'
import { toCsv, downloadCsv, safeFilenamePart, csvTimestamp, CSV_EMPTY } from '@/lib/utils/csv'

const STATUS_PILL: Record<string, string> = {
  CONFIRMED: 'bg-green-500/15 text-green-400',
  PENDING:   'bg-yellow-500/15 text-yellow-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
  // Invite-only. Without these two the pill renders unstyled.
  APPLIED:   'bg-amber-400/15 text-amber-300',
  REJECTED:  'bg-white/8 text-white/40',
}

/** Only an application awaiting a decision can be approved or rejected. */
const DECIDABLE_STATUS = 'APPLIED'

/**
 * One runner's answer to one custom question, or null when unanswered.
 *
 * Blank, whitespace-only and missing all read as unanswered — a question the
 * runner skipped and one they answered with a space are the same thing to an
 * admin scanning the list.
 */
function rawAnswer(responses: CustomResponses, field: AdditionalField): string | null {
  const raw = responses[field.id]
  if (raw === undefined || raw === null) return null
  const text = String(raw).trim()
  return text.length > 0 ? text : null
}

/** The same answer as a display string, for the expanded attendee card. */
function answerFor(responses: CustomResponses, field: AdditionalField): string {
  return rawAnswer(responses, field) ?? CSV_EMPTY
}

/**
 * Makes a `link` answer clickable, but only when it is a real http(s) URL.
 * The register route validates these with `new URL()`, which accepts
 * `javascript:` — so the scheme is re-checked here rather than trusted.
 */
function linkHref(raw: string | number | undefined): string | undefined {
  if (typeof raw !== 'string') return undefined
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined
  } catch { return undefined }
}

function fmtDate(d: string | null) {
  return d ? formatDateNumericIST(d) : '—'
}

function fmtTime(d: string | null) {
  return d ? formatTimeIST(d) : null
}

/** The columns every participants export carries, in order. */
const CSV_BASE_HEADERS = [
  'Name of athlete',
  'Age',
  'Gender',
  'Contact number',
  'Emergency contact number',
  'Email ID',
  'Tier',
  'Runner tag',
  'Username',
  'Runs completed',
  'Role',
  'Status',
  'Checked in',
  'Checked in at',
  'Registered at',
  'Packages',
  'Amount due',
  'Coupon code',
  'Coupon %',
  'Discount',
  'Location',
] as const

/**
 * Export columns for one event: the fixed set above, then one column per custom
 * question in the order the admin authored them.
 *
 * The questions have to come from the event rather than from any one attendee's
 * answers: a runner who skipped an optional question has no key for it, so
 * deriving columns from responses would drop a question whose first few
 * respondents all left it blank, and would order columns by JSON key rather
 * than by the form. An unlabelled question still gets a named column so the
 * sheet never carries a header-less column of answers.
 */
function csvHeadersFor(fields: AdditionalField[]): string[] {
  return [
    ...CSV_BASE_HEADERS,
    ...fields.map((f, i) => f.label.trim() || `Question ${i + 1}`),
  ]
}

/**
 * One CSV row per attendee. Every blank lands as NULL via `toCsv`, so an admin
 * reading the sheet can tell "not provided" apart from "we lost it".
 *
 * `fields` must be the same array `csvHeadersFor` was given, so the answers line
 * up under their questions.
 */
function attendeeCsvRow(a: Attendee, fields: AdditionalField[]): (string | number | null)[] {
  return [
    a.full_name,
    a.age,
    a.gender ? GENDER_LABEL[a.gender] ?? a.gender : null,
    a.contact_number,
    a.emergency_contact_number,
    a.email,
    getMilestone(a.runs_completed).label,
    a.runner_tag,
    a.username,
    a.runs_completed,
    a.role,
    a.status,
    a.checked_in_at ? 'Yes' : 'No',
    a.checked_in_at ? formatDateTimeIST(a.checked_in_at) : null,
    formatDateTimeIST(a.registered_at),
    a.packages.map(p => p.name).join(' + '),
    a.amount_due_paise != null ? priceOf(a.amount_due_paise) : null,
    // null rather than a string when there is no coupon: `cell()` writes its own
    // unquoted NULL, so a blank here matches every other blank in the sheet.
    a.coupon_code,
    a.coupon_percent,
    a.discount_paise != null ? priceOf(a.discount_paise) : null,
    a.location,
    ...fields.map(f => rawAnswer(a.custom_responses, f)),
  ]
}

function CapacityBar({ confirmed, capacity }: { confirmed: number; capacity: number | null }) {
  if (!capacity) return <span className='text-white/30 text-xs tabular-nums font-mono'>{confirmed} registered</span>
  const pct = Math.min(100, Math.round((confirmed / capacity) * 100))
  const color = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-stride-yellow-accent' : 'bg-green-500'
  return (
    <div className='flex items-center gap-2'>
      <div className='w-16 bg-white/10 rounded-full h-1.5 overflow-hidden'>
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className='text-white/50 text-xs tabular-nums font-mono'>{confirmed}/{capacity}</span>
    </div>
  )
}

/**
 * The four numbers an admin working through an invite-only run needs side by
 * side. Applications are unlimited but approvals are capped at capacity, so
 * "how many applied" and "how many seats are left to give" are different
 * questions — the header's confirmed/capacity bar answers neither on its own.
 *
 * Invite-only only: on an ordinary event applying and being confirmed are the
 * same act, so three of these four tiles would repeat each other.
 */
function ApplicationStats({ event }: { event: EventWithAttendees }) {
  const remaining = event.capacity != null
    ? Math.max(0, event.capacity - event.confirmed_count)
    : null

  const tiles: { label: string; value: string | number; hint: string; tone: string }[] = [
    {
      label: 'Total registrations',
      // Every row on the event, whatever its status — including applications
      // that were turned down. The three tiles beside it are the breakdown.
      value: event.total_registrations,
      hint: `Every application received: ${event.confirmed_count} accepted, ${event.applied_count} awaiting review, ${event.rejected_count} rejected.`,
      tone: 'text-white',
    },
    {
      label: 'Max capacity',
      value: event.capacity ?? 'Unlimited',
      hint: event.capacity == null
        ? 'No capacity set — approvals are not capped.'
        : `${remaining} spot${remaining === 1 ? '' : 's'} left to give out.`,
      tone: 'text-white',
    },
    {
      label: 'Accepted',
      value: event.confirmed_count,
      hint: 'Approved applications. These runners are confirmed and have their ticket.',
      tone: 'text-green-400',
    },
    {
      label: 'To review',
      value: event.applied_count,
      hint: 'Applications still awaiting your decision.',
      tone: event.applied_count > 0 ? 'text-amber-300' : 'text-white/40',
    },
  ]

  return (
    <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 py-3 border-b border-white/8 bg-white/2'>
      {tiles.map(tile => (
        <div
          key={tile.label}
          title={tile.hint}
          className='bg-white/5 border border-white/10 rounded-xl px-3 py-2.5'
        >
          <p className='text-white/40 text-[11px] leading-tight'>{tile.label}</p>
          <p className={`text-xl font-bold tabular-nums font-mono mt-0.5 ${tile.tone}`}>{tile.value}</p>
        </div>
      ))}
    </div>
  )
}


/** The only status that goes into the participants CSV. */
const EXPORT_STATUS = 'CONFIRMED'

/**
 * One event's registrations, shown when its row is expanded on the Events tab:
 * participant search, package filter, CSV export and — on invite-only events —
 * bulk approve / reject.
 *
 * Mounted only while its event is expanded, so search, selection and the open
 * participant all reset when the admin moves to another event. The approval
 * budget is per event, so a selection spanning two of them could not be
 * capacity-capped correctly.
 */
export function EventRegistrationsPanel({ event }: { event: EventWithAttendees }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  /** '' = no package filter. */
  const [packageFilter, setPackageFilter] = useState('')
  /** Registration id of the attendee whose full details are open, if any. */
  const [expandedAttendeeId, setExpandedAttendeeId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [decisionPending, setDecisionPending] = useState<'approve' | 'reject' | null>(null)

  // One rule for the whole panel: search and the package filter narrow what is
  // listed, what "select all" covers, and what the CSV contains. Anything else
  // lets an admin act on rows they can't see.
  const visibleAttendees = useMemo(() => {
    const q = search.trim().toLowerCase()
    return event.attendees.filter(a =>
      (!packageFilter || a.packages.some(p => p.name === packageFilter)) &&
      (!q ||
        a.full_name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.username?.toLowerCase().includes(q) ||
        a.runner_tag?.toLowerCase().includes(q))
    )
  }, [event.attendees, search, packageFilter])

  const narrowed = visibleAttendees.length !== event.attendees.length
  // Only confirmed runners are exported — the sheet is the start list, and
  // pending, cancelled and rejected rows had to be filtered out by hand.
  const exportable = visibleAttendees.filter(a => a.status === EXPORT_STATUS)

  // Applications this admin can act on. Confirmed, cancelled and
  // already-rejected rows are deliberately not selectable — un-approving would
  // strand a sent ticket and a wallet pass.
  const decidableIds = visibleAttendees
    .filter(a => a.status === DECIDABLE_STATUS)
    .map(a => a.registration_id)
  const selectedHere = decidableIds.filter(id => selectedIds.has(id)).length
  const allDecidableSelected = decidableIds.length > 0 && selectedHere === decidableIds.length
  const someDecidableSelected = selectedHere > 0

  /**
   * Narrowing the list drops the selection. `decide()` acts on whatever is
   * selected, so leaving a filtered-out applicant checked would approve someone
   * the admin can no longer see.
   */
  function changeSearch(value: string) {
    setSearch(value)
    setSelectedIds(new Set())
  }

  function changePackageFilter(value: string) {
    setPackageFilter(value)
    setSelectedIds(new Set())
  }

  function toggleSelected(registrationId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(registrationId)) next.delete(registrationId)
      else next.add(registrationId)
      return next
    })
  }

  async function decide(action: 'approve' | 'reject') {
    const ids = [...selectedIds]
    if (ids.length === 0) return

    setDecisionPending(action)
    try {
      const result = action === 'approve'
        ? await approveRegistrationsAction(event.id, ids)
        : await rejectRegistrationsAction(event.id, ids)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      const { decided, alreadyDecided, skippedCapacity, capacity, confirmedAfter } = result
      const noun = decided.length === 1 ? 'applicant' : 'applicants'

      if (decided.length === 0) {
        toast.error(
          skippedCapacity.length > 0
            ? `Nothing approved — the event is full${capacity != null ? ` (${confirmedAfter}/${capacity})` : ''}.`
            : 'Nothing to decide — those applications were already handled.',
        )
        return
      }

      // Only the clauses that actually happened, so a clean run reads as one
      // short sentence rather than a report with three empty columns.
      const notes = [
        skippedCapacity.length > 0
          ? `${skippedCapacity.length} skipped — the event is full${capacity != null ? ` (${confirmedAfter}/${capacity})` : ''}.`
          : null,
        alreadyDecided.length > 0
          ? `${alreadyDecided.length} had already been decided by someone else.`
          : null,
        action === 'approve' ? 'Selection emails are on their way.' : null,
      ].filter(Boolean).join(' ')

      const total = decided.length + skippedCapacity.length
      const headline = action === 'approve'
        ? (skippedCapacity.length > 0
            ? `Approved ${decided.length} of ${total}.`
            : `Approved ${decided.length} ${noun}.`)
        : `Rejected ${decided.length} ${noun}.`

      toast.success(headline, notes ? { description: notes } : undefined)
      setSelectedIds(new Set())
      // The rows come from a server component, so the new statuses only appear
      // after the route re-renders with the caches the action just purged.
      router.refresh()
    } catch {
      toast.error(`Could not ${action} those applications. Please try again.`)
    } finally {
      setDecisionPending(null)
    }
  }

  /**
   * Exports the confirmed runners among the rows on screen, so a search or
   * package filter narrows the CSV the same way it narrows the list.
   */
  async function exportConfirmed() {
    if (exportable.length === 0) {
      toast.error('Nothing to export — no confirmed participants in this list.')
      return
    }

    setExporting(true)
    try {
      // Yield once so the spinner actually paints before the main thread goes
      // into building rows and encoding a Blob for a few hundred attendees.
      await new Promise(resolve => setTimeout(resolve, 0))

      // The event's own questions, so a run with custom fields exports them and
      // a run without them produces exactly the columns it always did.
      const fields = event.custom_fields
      const csv = toCsv(csvHeadersFor(fields), exportable.map(a => attendeeCsvRow(a, fields)))
      const filename = `Participants - ${safeFilenamePart(event.name)} - as of ${csvTimestamp()}.csv`
      downloadCsv(filename, csv)

      toast.success(`Downloaded ${exportable.length} confirmed participant${exportable.length === 1 ? '' : 's'}`, {
        description: filename,
      })
    } catch {
      toast.error('Could not generate the CSV. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      {event.invite_only && <ApplicationStats event={event} />}

      {/* Search + package filter — finding one runner in a few hundred rows
          was otherwise a scroll. */}
      {event.attendees.length > 0 && (
        <div className='flex flex-col sm:flex-row gap-2 px-4 pt-3'>
          <div className='relative flex-1'>
            <label htmlFor={`attendee-search-${event.id}`} className='sr-only'>
              Search participants of {event.name}
            </label>
            <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
            <input
              id={`attendee-search-${event.id}`}
              type='text'
              placeholder='Search name, tag, email…'
              value={search}
              onChange={e => changeSearch(e.target.value)}
              className='w-full min-h-11 bg-white/8 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
            />
          </div>
          {event.package_names.length > 0 && (
            <div className='relative shrink-0'>
              <label htmlFor={`package-filter-${event.id}`} className='sr-only'>Filter by package</label>
              <select
                id={`package-filter-${event.id}`}
                value={packageFilter}
                onChange={e => changePackageFilter(e.target.value)}
                className='w-full sm:w-auto min-h-11 appearance-none bg-white/8 border border-white/20 rounded-xl pl-4 pr-9 py-2.5 text-white text-sm cursor-pointer focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
              >
                <option value='' className='bg-stride-purple-primary'>All packages</option>
                {event.package_names.map(name => (
                  <option key={name} value={name} className='bg-stride-purple-primary'>{name}</option>
                ))}
              </select>
              <ChevronDown size={15} className='absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
            </div>
          )}
        </div>
      )}

      {/* Export toolbar */}
      <div className='flex items-center gap-3 px-4 py-3 border-b border-white/8'>
        <div className='min-w-0'>
          <p className='text-white/50 text-xs'>
            {narrowed
              ? `Showing ${visibleAttendees.length} of ${event.attendees.length} participants`
              : `${event.attendees.length} participant${event.attendees.length === 1 ? '' : 's'}`}
          </p>
          <p className='text-white/30 text-[11px]'>CSV exports confirmed only ({exportable.length})</p>
        </div>
        <button
          type='button'
          onClick={exportConfirmed}
          disabled={exporting || exportable.length === 0}
          className='ml-auto inline-flex shrink-0 items-center gap-2 min-h-11 px-3.5 rounded-md bg-stride-yellow-accent text-copy-black text-xs font-semibold hover:bg-stride-yellow-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
        >
          {exporting
            ? <Loader2 size={14} className='animate-spin' aria-hidden='true' />
            : <Download size={14} aria-hidden='true' />}
          {exporting ? 'Preparing…' : 'Download CSV'}
        </button>
      </div>

      {/* Application review bar. Only appears while there is something
          decidable, so an ordinary paid event's attendee list is untouched. */}
      {decidableIds.length > 0 && (
        <div className='flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/8 bg-amber-400/5'>
          <label className='flex items-center gap-2 cursor-pointer select-none min-h-11'>
            <input
              type='checkbox'
              checked={allDecidableSelected}
              ref={el => { if (el) el.indeterminate = someDecidableSelected && !allDecidableSelected }}
              onChange={() => setSelectedIds(new Set(allDecidableSelected ? [] : decidableIds))}
              className='accent-stride-yellow-accent w-4 h-4 shrink-0'
            />
            <span className='text-white/60 text-xs'>
              Select all {decidableIds.length} awaiting review
            </span>
          </label>

          {selectedIds.size > 0 && (
            <div className='flex items-center gap-2 ml-auto'>
              <button
                type='button'
                onClick={() => decide('approve')}
                disabled={decisionPending !== null}
                className='inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-md bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-semibold hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                {decisionPending === 'approve'
                  ? <Loader2 size={13} className='animate-spin' aria-hidden='true' />
                  : <Check size={13} aria-hidden='true' />}
                Approve ({selectedIds.size})
              </button>
              <button
                type='button'
                onClick={() => decide('reject')}
                disabled={decisionPending !== null}
                className='inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-md bg-white/8 border border-white/20 text-white/70 text-xs font-semibold hover:bg-white/12 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                {decisionPending === 'reject'
                  ? <Loader2 size={13} className='animate-spin' aria-hidden='true' />
                  : <X size={13} aria-hidden='true' />}
                Reject ({selectedIds.size})
              </button>
            </div>
          )}
        </div>
      )}

      {visibleAttendees.length === 0 ? (
        <p className='text-white/30 text-sm px-4 py-5 text-center'>
          {narrowed ? 'No participants match your search.' : 'No registrations for this event yet.'}
        </p>
      ) : (
        <div className='divide-y divide-white/4'>
            {visibleAttendees.map(a => {
              const tier = getMilestone(a.runs_completed)
              const isOpen = expandedAttendeeId === a.registration_id
              const contactHref = telHref(a.contact_number)
              const emergencyHref = telHref(a.emergency_contact_number)

              return (
                <div key={a.registration_id}>
                  <div className='flex items-center gap-3 px-4 py-3 hover:bg-white/2'>

                    {/* Selection — only for a row that can
                        actually be decided. A spacer keeps the
                        avatars in one column when some rows in
                        the list are already decided. */}
                    {decidableIds.length > 0 && (
                      a.status === DECIDABLE_STATUS ? (
                        <input
                          type='checkbox'
                          checked={selectedIds.has(a.registration_id)}
                          onChange={() => toggleSelected(a.registration_id)}
                          aria-label={`Select ${a.full_name ?? 'applicant'} for approval or rejection`}
                          className='accent-stride-yellow-accent w-4 h-4 shrink-0 cursor-pointer'
                        />
                      ) : (
                        <span className='w-4 shrink-0' aria-hidden='true' />
                      )
                    )}

                    {/* Avatar */}
                    <Avatar url={a.avatar_url} name={a.full_name} size='sm' />

                    {/* Runner info — name, email, mobile */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-1.5 flex-wrap'>
                        <p className='font-medium text-sm truncate text-white/80'>
                          {a.full_name ?? '—'}
                        </p>
                        {a.runner_tag && <RunnerTagBadge tag={a.runner_tag} size='xs' />}
                      </div>
                      <p className='text-white/30 text-xs truncate'>{a.email ?? '—'}</p>
                      {contactHref ? (
                        <a
                          href={contactHref}
                          onClick={e => e.stopPropagation()}
                          className='text-stride-yellow-accent/80 text-xs hover:underline underline-offset-2'
                        >
                          {a.contact_number}
                        </a>
                      ) : (
                        <p className='text-white/20 text-xs'>No contact number</p>
                      )}
                      {a.packages.length > 0 && (
                        <p className='text-stride-yellow-accent/70 text-xs mt-1 line-clamp-1'>
                          {a.packages.map(p => p.name).join(' + ')}
                          {a.amount_due_paise != null && (
                            <span className='text-white/30'> · {priceOf(a.amount_due_paise)}</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Milestone tier — badge always, name where there's room */}
                    <div className='flex items-center gap-1.5 shrink-0'>
                      <TierBadge tier={tier} size='sm' />
                      <span className='hidden md:line-clamp-1 text-white/50 text-xs font-medium'>
                        {tier.label}
                      </span>
                    </div>

                    {/* Status + check-in */}
                    <div className='shrink-0 text-right'>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_PILL[a.status] ?? 'bg-white/10 text-white/50'}`}>
                        {a.status}
                      </span>
                      {a.checked_in_at ? (
                        <p className='text-green-400 text-xs mt-1 flex items-center justify-end gap-1'>
                          <CheckCircle size={9} />
                          {fmtTime(a.checked_in_at)}
                        </p>
                      ) : (
                        <p className='text-white/20 text-xs mt-1'>{fmtDate(a.registered_at)}</p>
                      )}
                    </div>

                    {/* Details toggle */}
                    <button
                      type='button'
                      onClick={() => setExpandedAttendeeId(isOpen ? null : a.registration_id)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Hide participant details' : 'Show participant details'}
                      className='text-white/25 hover:text-white/60 transition-colors shrink-0 p-1.5 rounded-lg hover:bg-white/5'
                    >
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Full participant details */}
                  {isOpen && (
                    <div className='px-4 pb-4 pt-1 bg-white/2 border-t border-white/5'>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-3'>
                        <Fact
                          icon={<Mail size={12} />}
                          label='Email'
                          value={a.email ?? CSV_EMPTY}
                          href={mailtoHref(a.email)}
                        />
                        <Fact icon={<UserRound size={12} />} label='Username' value={a.username ? `@${a.username}` : CSV_EMPTY} />
                        <Fact icon={<Cake size={12} />} label='Age' value={a.age !== null ? `${a.age} years` : CSV_EMPTY} />
                        <Fact
                          icon={<UserRound size={12} />}
                          label='Gender'
                          value={a.gender ? GENDER_LABEL[a.gender] ?? a.gender : CSV_EMPTY}
                        />
                        <Fact
                          icon={<Phone size={12} />}
                          label='Contact'
                          value={a.contact_number ?? CSV_EMPTY}
                          href={contactHref}
                        />
                        <Fact
                          icon={<AlertCircle size={12} />}
                          label='Emergency contact'
                          value={a.emergency_contact_number ?? CSV_EMPTY}
                          href={emergencyHref}
                        />
                        <Fact icon={<MapPin size={12} />} label='Location' value={a.location ?? CSV_EMPTY} />
                        <Fact
                          icon={<TierBadge tier={tier} size='xs' />}
                          label='Tier'
                          value={`${tier.label} · ${a.runs_completed} runs`}
                        />
                        <Fact
                          icon={<CalendarPlus size={12} />}
                          label='Registered'
                          value={formatDateTimeIST(a.registered_at)}
                        />
                        <Fact
                          icon={<CheckCircle size={12} />}
                          label='Checked in'
                          value={a.checked_in_at ? formatDateTimeIST(a.checked_in_at) : 'Not yet'}
                        />
                        {a.packages.length > 0 && (
                          <Fact
                            icon={<Ticket size={12} />}
                            label='Packages'
                            value={`${a.packages.map(p => p.name).join(' + ')}${
                              a.amount_due_paise != null ? ` · ${priceOf(a.amount_due_paise)}` : ''
                            }`}
                          />
                        )}
                        {/* Only for the few who redeemed one. The
                            amount above is already discounted, so
                            this says what came off and why. */}
                        {a.coupon_code && (
                          <Fact
                            icon={<Tag size={12} />}
                            label='Coupon'
                            value={`${a.coupon_code}${
                              a.coupon_percent != null ? ` · ${a.coupon_percent}% off` : ''
                            }${
                              a.discount_paise != null ? ` · ${priceOf(a.discount_paise)} saved` : ''
                            }`}
                          />
                        )}
                      </div>

                      {/* Answers to the event's custom questions.
                          Driven by the event's field list, not the
                          response object's keys: an optional question
                          the runner skipped still shows, and the order
                          matches the form they filled in rather than
                          JSON key order. */}
                      {event.custom_fields.length > 0 && (
                        <div className='mt-4 pt-3 border-t border-white/8'>
                          <p className='text-white/25 text-[10px] font-bold font-mono uppercase tracking-widest mb-2.5'>
                            Form responses
                          </p>
                          <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3'>
                            {event.custom_fields.map(field => (
                              <Fact
                                key={field.id}
                                icon={<ClipboardList size={12} />}
                                label={field.label}
                                value={answerFor(a.custom_responses, field)}
                                href={field.type === 'link' ? linkHref(a.custom_responses[field.id]) : undefined}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
