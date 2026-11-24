'use client'

import { useMemo, useState } from 'react'
import { ArrowUpDown, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import clsx from 'clsx'
import type { AdditionalField } from '@/types/event'
import type { Attendee } from '@/types/admin-registrations'
import { GENDER_LABEL } from '@/components/admin/user-facts'
import {
  ANY_COUPON, NO_COUPON, UNANSWERED, EMPTY_FILTERS,
  answerText, countActiveFilters, countBy, couponKey, filterableFields,
  type AttendeeFilters, type SortKey,
} from '@/lib/admin/attendee-filters'

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmed',
  APPLIED: 'Awaiting review',
  AWAITING_PAYMENT: 'Awaiting payment',
  PENDING: 'Pending payment',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

type Option = { value: string; label: string }

const selectClass =
  'w-full min-h-11 appearance-none bg-white/8 border border-white/20 rounded-xl pl-3.5 pr-9 py-2.5 text-white text-sm cursor-pointer focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'

function FilterSelect({ id, label, value, allLabel, options, onChange }: {
  id: string
  label: string
  value: string
  allLabel: string
  options: Option[]
  onChange: (value: string) => void
}) {
  return (
    <div className='min-w-0'>
      <label htmlFor={id} className='block text-white/45 text-[11px] font-medium mb-1 line-clamp-1' title={label}>
        {label}
      </label>
      <div className='relative'>
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={clsx(selectClass, value && 'border-stride-yellow-accent/60')}
        >
          <option value='' className='bg-stride-purple-primary'>{allLabel}</option>
          {options.map(o => (
            <option key={o.value} value={o.value} className='bg-stride-purple-primary'>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={15} className='absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
      </div>
    </div>
  )
}

/** "Label (n)" — counts are over every registration, so they don't shift as filters change. */
function withCount(label: string, count: number | undefined): string {
  return `${label} (${count ?? 0})`
}

function useFilterOptions(attendees: Attendee[], fields: AdditionalField[]) {
  return useMemo(() => {
    const statusCounts = countBy(attendees, a => a.status)
    const genderCounts = countBy(attendees, a => a.gender ?? UNANSWERED)
    const couponCounts = countBy(attendees, a => couponKey(a.coupon_code))
    const checkedIn = attendees.filter(a => a.checked_in_at).length
    const usedCoupons = [...couponCounts].filter(([code]) => code !== null) as [string, number][]

    const status: Option[] = [...statusCounts]
      .map(([s, n]) => ({ value: s, label: withCount(STATUS_LABEL[s] ?? s, n) }))
    const gender: Option[] = [...genderCounts]
      .map(([g, n]) => ({ value: g, label: withCount(g === UNANSWERED ? 'Not set' : GENDER_LABEL[g] ?? g, n) }))
      .sort((a, b) => (a.value === UNANSWERED ? 1 : 0) - (b.value === UNANSWERED ? 1 : 0))
    const coupon: Option[] = usedCoupons.length === 0 ? [] : [
      { value: ANY_COUPON, label: withCount('Any coupon', attendees.length - (couponCounts.get(null) ?? 0)) },
      { value: NO_COUPON, label: withCount('No coupon', couponCounts.get(null)) },
      ...usedCoupons.sort(([, x], [, y]) => y - x).map(([code, n]) => ({ value: code, label: withCount(code, n) })),
    ]
    const checkIn: Option[] = checkedIn === 0 ? [] : [
      { value: 'in', label: withCount('Checked in', checkedIn) },
      { value: 'out', label: withCount('Not checked in', attendees.length - checkedIn) },
    ]
    const packages = new Map<string, number>()
    for (const a of attendees) for (const { name } of a.packages) packages.set(name, (packages.get(name) ?? 0) + 1)

    const questions = filterableFields(fields).map(field => {
      const counts = countBy(attendees, a => answerText(a, field) ?? UNANSWERED)
      const options: Option[] = (field.options ?? []).map(o => ({ value: o, label: withCount(o, counts.get(o)) }))
      // Answers to an option the admin has since renamed or removed still need a way in.
      for (const [answer, n] of counts) {
        if (answer !== UNANSWERED && !field.options?.includes(answer)) {
          options.push({ value: answer, label: withCount(`${answer} (old option)`, n) })
        }
      }
      if (counts.get(UNANSWERED)) options.push({ value: UNANSWERED, label: withCount('Not answered', counts.get(UNANSWERED)) })
      return { field, options }
    })

    return { status, gender, coupon, checkIn, packages, questions }
  }, [attendees, fields])
}

function sortOptions(fields: AdditionalField[]): Option[] {
  return [
    { value: 'registered-desc', label: 'Newest registered' },
    { value: 'registered-asc', label: 'Oldest registered' },
    { value: 'name-asc', label: 'Name A → Z' },
    { value: 'name-desc', label: 'Name Z → A' },
    { value: 'runs-desc', label: 'Most runs completed' },
    { value: 'runs-asc', label: 'Fewest runs completed' },
    { value: 'age-asc', label: 'Youngest first' },
    { value: 'age-desc', label: 'Oldest first' },
    ...fields.map((f, i) => ({ value: `field:${f.id}`, label: `By answer: ${f.label.trim() || `Question ${i + 1}`}` })),
  ]
}

/**
 * Search, sort and filters for one event's participants. Controlled: the panel
 * owns the state so it can clear the approval selection whenever the visible
 * set changes.
 */
export function AttendeeFilterBar({ eventId, attendees, fields, packageNames, filters, sort, onFiltersChange, onSortChange }: {
  eventId: string
  attendees: Attendee[]
  fields: AdditionalField[]
  packageNames: string[]
  filters: AttendeeFilters
  sort: SortKey
  onFiltersChange: (next: AttendeeFilters) => void
  onSortChange: (next: SortKey) => void
}) {
  const [open, setOpen] = useState(true)
  const options = useFilterOptions(attendees, fields)
  const activeCount = countActiveFilters(filters)

  const set = (patch: Partial<AttendeeFilters>) => onFiltersChange({ ...filters, ...patch })
  const setAnswer = (fieldId: string, value: string) =>
    onFiltersChange({ ...filters, answers: { ...filters.answers, [fieldId]: value } })

  const optionLabel = (list: Option[], value: string) =>
    (list.find(o => o.value === value)?.label ?? value).replace(/ \(\d+\)$/, '')

  const chips: { key: string; label: string; clear: () => void }[] = [
    filters.status && { key: 'status', label: `Status: ${optionLabel(options.status, filters.status)}`, clear: () => set({ status: '' }) },
    filters.gender && { key: 'gender', label: `Gender: ${optionLabel(options.gender, filters.gender)}`, clear: () => set({ gender: '' }) },
    filters.coupon && { key: 'coupon', label: `Coupon: ${optionLabel(options.coupon, filters.coupon)}`, clear: () => set({ coupon: '' }) },
    filters.checkIn && { key: 'checkin', label: optionLabel(options.checkIn, filters.checkIn), clear: () => set({ checkIn: '' }) },
    filters.packageName && { key: 'package', label: `Package: ${filters.packageName}`, clear: () => set({ packageName: '' }) },
    ...options.questions
      .filter(({ field }) => filters.answers[field.id])
      .map(({ field, options: opts }) => ({
        key: `q-${field.id}`,
        label: `${field.label}: ${optionLabel(opts, filters.answers[field.id])}`,
        clear: () => setAnswer(field.id, ''),
      })),
  ].filter((c): c is { key: string; label: string; clear: () => void } => Boolean(c))

  const hasAnyFilter = options.status.length > 1 || options.gender.length > 0 || options.coupon.length > 0
    || options.checkIn.length > 0 || packageNames.length > 0 || options.questions.length > 0

  return (
    <div className='px-4 pt-3 flex flex-col gap-3'>
      <div className='flex flex-col sm:flex-row gap-2'>
        <div className='relative flex-1'>
          <label htmlFor={`attendee-search-${eventId}`} className='sr-only'>Search participants</label>
          <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
          <input
            id={`attendee-search-${eventId}`}
            type='search'
            placeholder='Search name, tag, email, phone, coupon, answers…'
            value={filters.search}
            onChange={e => set({ search: e.target.value })}
            className='w-full min-h-11 bg-white/8 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
          />
        </div>
        <div className='flex gap-2'>
          <div className='relative flex-1 sm:w-56'>
            <label htmlFor={`attendee-sort-${eventId}`} className='sr-only'>Sort participants</label>
            <ArrowUpDown size={14} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
            <select
              id={`attendee-sort-${eventId}`}
              value={sort}
              onChange={e => onSortChange(e.target.value as SortKey)}
              className={clsx(selectClass, 'pl-9')}
            >
              {sortOptions(fields).map(o => (
                <option key={o.value} value={o.value} className='bg-stride-purple-primary'>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={15} className='absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
          </div>
          {hasAnyFilter && (
            <button
              type='button'
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              aria-controls={`attendee-filters-${eventId}`}
              className={clsx(
                'inline-flex shrink-0 items-center gap-1.5 min-h-11 px-3.5 rounded-md border text-xs font-semibold transition-colors',
                activeCount > 0
                  ? 'border-stride-yellow-accent/60 text-stride-yellow-accent bg-stride-yellow-accent/10'
                  : 'border-white/20 text-white/70 bg-white/8 hover:text-white',
              )}
            >
              <SlidersHorizontal size={14} aria-hidden='true' />
              Filters{activeCount > 0 && ` (${activeCount})`}
            </button>
          )}
        </div>
      </div>

      {hasAnyFilter && open && (
        <div id={`attendee-filters-${eventId}`} className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-white/3 border border-white/10 rounded-xl p-3'>
          {options.questions.map(({ field, options: opts }) => (
            <FilterSelect
              key={field.id}
              id={`attendee-q-${eventId}-${field.id}`}
              label={field.label || 'Untitled question'}
              value={filters.answers[field.id] ?? ''}
              allLabel='Any answer'
              options={opts}
              onChange={v => setAnswer(field.id, v)}
            />
          ))}
          {options.gender.length > 0 && (
            <FilterSelect id={`attendee-gender-${eventId}`} label='Gender' value={filters.gender} allLabel='All genders' options={options.gender} onChange={v => set({ gender: v })} />
          )}
          {options.coupon.length > 0 && (
            <FilterSelect id={`attendee-coupon-${eventId}`} label='Coupon' value={filters.coupon} allLabel='All' options={options.coupon} onChange={v => set({ coupon: v })} />
          )}
          {options.status.length > 1 && (
            <FilterSelect id={`attendee-status-${eventId}`} label='Status' value={filters.status} allLabel='All statuses' options={options.status} onChange={v => set({ status: v })} />
          )}
          {options.checkIn.length > 0 && (
            <FilterSelect id={`attendee-checkin-${eventId}`} label='Check-in' value={filters.checkIn} allLabel='All' options={options.checkIn} onChange={v => set({ checkIn: v as AttendeeFilters['checkIn'] })} />
          )}
          {packageNames.length > 0 && (
            <FilterSelect
              id={`attendee-package-${eventId}`}
              label='Package'
              value={filters.packageName}
              allLabel='All packages'
              options={packageNames.map(n => ({ value: n, label: withCount(n, options.packages.get(n)) }))}
              onChange={v => set({ packageName: v })}
            />
          )}
        </div>
      )}

      {chips.length > 0 && (
        <div className='flex flex-wrap items-center gap-1.5'>
          {chips.map(chip => (
            <button
              key={chip.key}
              type='button'
              onClick={chip.clear}
              aria-label={`Remove filter ${chip.label}`}
              className='inline-flex max-w-full items-center gap-1 min-h-8 pl-2.5 pr-2 rounded-md bg-stride-yellow-accent/15 border border-stride-yellow-accent/40 text-stride-yellow-accent text-xs hover:bg-stride-yellow-accent/25 transition-colors'
            >
              <span className='line-clamp-1 break-all'>{chip.label}</span>
              <X size={12} aria-hidden='true' className='shrink-0' />
            </button>
          ))}
          {chips.length > 1 && (
            <button
              type='button'
              onClick={() => onFiltersChange({ ...EMPTY_FILTERS, search: filters.search })}
              className='min-h-8 px-2 text-xs text-white/50 hover:text-white underline underline-offset-2'
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
