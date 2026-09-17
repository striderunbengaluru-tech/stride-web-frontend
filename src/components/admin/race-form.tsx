'use client'

import { useRef, useState, useCallback, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { nanoid } from 'nanoid'
import {
  X, Plus, Eye, GripVertical, AlertTriangle, CheckCircle2, PauseCircle, XCircle,
  Type, FileText, Calendar, Clock, Hourglass, MapPin, Building2, Gauge, Link2, Tag, ImageIcon, Flag,
} from 'lucide-react'
import type { RaceActionResult } from '@/lib/validations/admin'
import {
  RACE_DISTANCES, RACE_DISTANCE_KEYS, MAX_RACE_DISTANCES, MAX_CUSTOM_DISTANCE_LENGTH, MAX_RACE_POSTERS,
  MAX_RACE_COUPON_LENGTH, isCanonicalDistance, normaliseDistance, distanceLabel,
} from '@/types/race'
import { reportFormError, type FieldError } from '@/lib/utils/form-errors'
import { HelpHint } from '@/components/ui/help-hint'
import { UploadProgress } from '@/components/ui/upload-progress'
import { RacePreview, RACE_PREVIEW_STORAGE_KEY } from '@/components/admin/race-preview'
import { Field, Widget, StatusPill, SubmitButton, inputBase, type Status } from '@/components/admin/form-primitives'
import { useSplitPane } from '@/hooks/use-split-pane'
import { slugify } from '@/lib/utils/slug'
import { uploadWithProgress } from '@/lib/utils/upload'
import { istLocalToUtcIso } from '@/lib/utils/ist'
import { STORAGE_PUBLIC_BASE } from '@/lib/utils/storage-paths'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

const ADMIN_RACES_PATH = '/admin/race-calendar'
const CITY_LIST_ID = 'race-city-suggestions'
const CUSTOM_DISTANCE_PATTERN = /^[A-Za-z0-9 .+-]+$/

/** Suggestions only — the admin may type any city. */
const INDIA_CITIES = [
  'Bengaluru', 'Mumbai', 'New Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Mysuru',
  'Goa', 'Kochi', 'Ahmedabad', 'Jaipur', 'Chandigarh', 'Coimbatore', 'Ooty', 'Ladakh',
]

/** Flat, string-shaped form state. Dates are IST wall clocks as the inputs hold them. */
export type RaceFormValues = {
  name: string
  description: string
  raceDate: string
  startTime: string
  registrationDeadline: string
  city: string
  venue: string
  organizer: string
  distances: string[]
  registrationUrl: string
  couponCode: string
  status: Status
  posterImages: string[]
}

type PendingUpload = { id: string; file: File; progress: number; status: 'uploading' | 'error'; error?: string }

type Props = {
  action: (prev: RaceActionResult, formData: FormData) => Promise<RaceActionResult>
  defaultValues?: Partial<RaceFormValues>
  submitLabel: string
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch { return false }
}

export function RaceForm({ action, defaultValues = {}, submitLabel }: Props) {
  const router = useRouter()
  const [actionResult, formAction] = useActionState(action, undefined)

  const [name, setName] = useState(defaultValues.name ?? '')
  const [description, setDescription] = useState(defaultValues.description ?? '')
  const [raceDate, setRaceDate] = useState(defaultValues.raceDate ?? '')
  const [startTime, setStartTime] = useState(defaultValues.startTime ?? '')
  const [registrationDeadline, setRegistrationDeadline] = useState(defaultValues.registrationDeadline ?? '')
  const [city, setCity] = useState(defaultValues.city ?? '')
  const [venue, setVenue] = useState(defaultValues.venue ?? '')
  const [organizer, setOrganizer] = useState(defaultValues.organizer ?? '')
  const [distances, setDistances] = useState<string[]>(defaultValues.distances ?? [])
  const [customDistance, setCustomDistance] = useState('')
  const [registrationUrl, setRegistrationUrl] = useState(defaultValues.registrationUrl ?? '')
  const [couponCode, setCouponCode] = useState(defaultValues.couponCode ?? '')
  const [status, setStatus] = useState<Status>(defaultValues.status ?? 'DRAFT')
  const [posterImages, setPosterImages] = useState<string[]>(defaultValues.posterImages ?? [])
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([])
  const [formError, setFormError] = useState<FieldError | null>(null)
  const posterFileRef = useRef<HTMLInputElement>(null)
  const [imgDragSrc, setImgDragSrc] = useState<number | null>(null)
  const [imgDragOver, setImgDragOver] = useState<number | null>(null)

  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Unsaved-changes guard — the browser's native leave dialog once anything changed.
  const [isDirty, setIsDirty] = useState(false)
  const markDirty = useCallback(() => { setIsDirty(true) }, [])
  useEffect(() => {
    if (!isDirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  // A server rejection gets the same toast + focus treatment as a client one.
  useEffect(() => {
    if (!actionResult?.error) return
    setFormError({ message: actionResult.error, field: actionResult.field })
    reportFormError({ message: actionResult.error, field: actionResult.field })
    setIsDirty(true)
  }, [actionResult])

  const { containerRef, formWidthPct, onDragStart } = useSplitPane()

  // ── Distances ──
  function toggleDistance(key: string) {
    setDistances(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key])
    markDirty()
  }

  function addCustomDistance(): string | null {
    const value = normaliseDistance(customDistance)
    if (!value) return null
    if (value.length > MAX_CUSTOM_DISTANCE_LENGTH) return 'Keep each distance short'
    if (!CUSTOM_DISTANCE_PATTERN.test(value)) return 'Distances may only use letters, numbers, spaces, ., + and -'
    if (distances.length >= MAX_RACE_DISTANCES) return `At most ${MAX_RACE_DISTANCES} distances`
    if (!distances.includes(value)) setDistances(prev => [...prev, value])
    setCustomDistance('')
    markDirty()
    return null
  }

  function onCustomDistanceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const problem = addCustomDistance()
    if (problem) reportFormError({ message: problem, field: 'distances' })
  }

  // ── Posters ──
  async function uploadPoster(id: string, file: File) {
    setPendingUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'uploading', progress: 0, error: undefined } : u))
    try {
      const data = await uploadWithProgress<{ url?: string }>({
        url: '/api/admin/upload-event-cover',
        file,
        fileName: file.name,
        // kind=race files the poster under images/races/ — without it the
        // upload would land with the event banners and never be cleaned up.
        fields: { kind: 'race', ...(name.trim() ? { name: name.trim() } : {}) },
        onProgress: (p) => setPendingUploads(prev => prev.map(u => u.id === id ? { ...u, progress: p } : u)),
      })
      if (data.url) {
        setPosterImages(prev => [...prev, data.url as string])
        markDirty()
      }
      setPendingUploads(prev => prev.filter(u => u.id !== id))
    } catch (err) {
      setPendingUploads(prev => prev.map(u =>
        u.id === id ? { ...u, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' } : u
      ))
    }
  }

  function handlePosterFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    const slots = MAX_RACE_POSTERS - posterImages.length - pendingUploads.length
    const entries = files.slice(0, Math.max(slots, 0)).map(file => ({ id: nanoid(8), file, progress: 0, status: 'uploading' as const }))
    if (entries.length === 0) return
    setPendingUploads(prev => [...prev, ...entries])
    for (const entry of entries) void uploadPoster(entry.id, entry.file)
  }

  async function removePoster(index: number) {
    const url = posterImages[index]
    setPosterImages(prev => prev.filter((_, i) => i !== index))
    markDirty()
    if (url?.startsWith(STORAGE_PUBLIC_BASE)) {
      await fetch('/api/admin/delete-event-image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
    }
  }

  function handleImageDrop(i: number) {
    if (imgDragSrc === null || imgDragSrc === i) { setImgDragSrc(null); setImgDragOver(null); return }
    const next = [...posterImages]
    const [moved] = next.splice(imgDragSrc, 1)
    next.splice(i, 0, moved)
    setPosterImages(next)
    markDirty()
    setImgDragSrc(null)
    setImgDragOver(null)
  }

  // ── Validation (mirrors raceSchema, top to bottom) ──
  function validateForm(): FieldError | null {
    if (!name.trim()) return { message: 'Race name is required', field: 'name' }
    if (!raceDate) return { message: 'Race date is required', field: 'raceDate' }
    if (registrationDeadline) {
      const deadline = istLocalToUtcIso(registrationDeadline)
      const raceEnd = istLocalToUtcIso(`${raceDate}T23:59`)
      if (deadline && raceEnd && deadline > raceEnd) {
        return { message: 'The registration deadline must be on or before race day', field: 'registrationDeadline' }
      }
    }
    if (!city.trim()) return { message: 'City is required', field: 'city' }
    if (distances.length === 0) return { message: 'Pick at least one distance', field: 'distances' }
    if (!registrationUrl.trim() && !couponCode.trim()) {
      return { message: 'Add a registration link or a coupon code — runners need at least one.', field: 'registrationUrl' }
    }
    if (registrationUrl.trim() && !isValidHttpUrl(registrationUrl.trim())) {
      return { message: 'Must be a valid URL', field: 'registrationUrl' }
    }
    if (couponCode.trim() && couponCode.trim().length < 2) {
      return { message: 'A coupon code needs at least 2 characters', field: 'couponCode' }
    }
    return null
  }

  function handlePreview() {
    const payload = {
      name, description, raceDate, startTime, registrationDeadline, city, venue, organizer,
      distances, registrationUrl, couponCode, posterImages, slug: previewSlug,
    }
    try { sessionStorage.setItem(RACE_PREVIEW_STORAGE_KEY, JSON.stringify(payload)) } catch {}
    window.open(`${ADMIN_RACES_PATH}/preview`, '_blank')
  }

  const previewSlug = name.trim() ? slugify(name) || 'your-race-name' : 'your-race-name'
  const customDistances = distances.filter(d => !isCanonicalDistance(d))

  return (
    <>
      {cancelModalOpen && mounted && createPortal(
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4' onClick={() => setCancelModalOpen(false)}>
          <div className='bg-stride-purple-primary border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='w-12 h-12 rounded-full bg-stride-yellow-accent/15 flex items-center justify-center mb-4'>
              <AlertTriangle size={20} className='text-stride-yellow-accent' />
            </div>
            <h2 className='text-white font-bold text-lg mb-1'>Discard your changes?</h2>
            <p className='text-white/60 text-sm mb-1'>Anything you&apos;ve typed here will be lost.</p>
            <p className='text-white/40 text-xs mb-6'>This action cannot be undone.</p>
            <div className='flex gap-3'>
              <button type='button' onClick={() => setCancelModalOpen(false)} className='flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 text-sm hover:border-white/30 transition-colors min-h-11'>
                Keep editing
              </button>
              <button type='button' onClick={() => router.push(ADMIN_RACES_PATH)} className='flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors min-h-11'>
                Yes, discard
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div ref={containerRef} className='flex items-start flex-col lg:flex-row'>
        <div
          style={{ ['--form-w' as string]: `${formWidthPct}%` } as React.CSSProperties}
          className='w-full lg:w-(--form-w) lg:shrink-0 min-w-0'
        >
          <form
            action={formAction}
            noValidate
            onSubmit={(e) => {
              const problem = validateForm()
              setFormError(problem)
              if (problem) {
                e.preventDefault()
                reportFormError(problem)
                return
              }
              setIsDirty(false)
            }}
            onInput={markDirty}
            className='space-y-5 lg:pr-2'
          >
            {formError && (
              <div role='alert' className='bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm'>
                {formError.message}
              </div>
            )}

            {/* Hidden mirrors for state that is not a plain input */}
            <input type='hidden' name='description' value={description} readOnly />
            <input type='hidden' name='distances' value={JSON.stringify(distances)} readOnly />
            <input type='hidden' name='posterImages' value={JSON.stringify(posterImages)} readOnly />
            <input type='hidden' name='status' value={status} readOnly />

            {/* ── STATUS ── */}
            <div className='bg-white/4 border border-white/10 rounded-2xl px-4 py-4 sm:px-5 sm:py-5'>
              <div className='flex items-center gap-2 mb-3'>
                <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest'>Race status</p>
                <HelpHint text='PUBLISHED: listed on /race-calendar. DRAFT: visible only in admin. CANCELLED: kept in admin with a red badge, hidden from runners.' />
              </div>
              <div className='grid grid-cols-3 gap-2'>
                <StatusPill value='PUBLISHED' active={status === 'PUBLISHED'} onClick={() => { setStatus('PUBLISHED'); markDirty() }}
                  icon={<CheckCircle2 size={14} />} label='Published' tone='green' />
                <StatusPill value='DRAFT' active={status === 'DRAFT'} onClick={() => { setStatus('DRAFT'); markDirty() }}
                  icon={<PauseCircle size={14} />} label='Draft' tone='yellow' />
                <StatusPill value='CANCELLED' active={status === 'CANCELLED'} onClick={() => { setStatus('CANCELLED'); markDirty() }}
                  icon={<XCircle size={14} />} label='Cancelled' tone='red' />
              </div>
            </div>

            {/* ── BASICS ── */}
            <Widget icon={<Flag size={15} />} title='Race'>
              <Field
                icon={<Type size={14} />} label='Race name' required
                name='name' value={name} onChange={setName}
                placeholder='e.g. Bengaluru 10K Challenge 2027'
                help='The public name. The link is generated from it once and never changes.'
              />
              <p className='text-white/30 text-xs mt-1.5 font-mono truncate'>strideclub.in/race-calendar/{previewSlug}</p>

              <div className='flex flex-col gap-1.5 mt-4' data-field='description'>
                <div className='flex items-center gap-1.5'>
                  <FileText size={14} className='text-white/40' />
                  <label className='text-white/70 text-sm font-medium'>Description</label>
                  <HelpHint text='Markdown. What the race is, the route, who it suits, anything Stride runners should know. Shown on the race page.' />
                </div>
                <div data-color-mode='dark' className='rounded-lg overflow-hidden border border-white/20'>
                  <MDEditor value={description} onChange={(v) => { setDescription(v ?? ''); markDirty() }} height={220} preview='edit' />
                </div>
              </div>
            </Widget>

            {/* ── WHEN ── */}
            <Widget icon={<Calendar size={15} />} title='When'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Field
                  icon={<Calendar size={14} />} label='Race date' required type='date'
                  name='raceDate' value={raceDate} onChange={setRaceDate}
                  help='The day the race is run, IST.'
                />
                <Field
                  icon={<Clock size={14} />} label='Start time' type='time'
                  name='startTime' value={startTime} onChange={setStartTime}
                  help="Leave blank if the organiser hasn't announced a start time — the page will say so."
                />
              </div>
              <div className='mt-4'>
                <Field
                  icon={<Hourglass size={14} />} label='Registration deadline' type='datetime-local'
                  name='registrationDeadline' value={registrationDeadline} onChange={setRegistrationDeadline}
                  help='When the organiser closes registrations, IST. After this the Register button and coupon are hidden.'
                />
              </div>
            </Widget>

            {/* ── WHERE ── */}
            <Widget icon={<MapPin size={15} />} title='Where'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Field
                  icon={<MapPin size={14} />} label='City' required list={CITY_LIST_ID}
                  name='city' value={city} onChange={setCity}
                  placeholder='e.g. Bengaluru'
                  help='Drives the city filter on the public calendar.'
                />
                <datalist id={CITY_LIST_ID}>
                  {INDIA_CITIES.map(c => <option key={c} value={c} />)}
                </datalist>
                <Field
                  icon={<MapPin size={14} />} label='Venue'
                  name='venue' value={venue} onChange={setVenue}
                  placeholder='e.g. Sree Kanteerava Stadium'
                />
              </div>
              <div className='mt-4'>
                <Field
                  icon={<Building2 size={14} />} label='Organiser'
                  name='organizer' value={organizer} onChange={setOrganizer}
                  placeholder='e.g. Procam International'
                />
              </div>
            </Widget>

            {/* ── DISTANCES ── */}
            <Widget icon={<Gauge size={15} />} title='Distances'>
              <div data-field='distances'>
                <div className='flex flex-wrap gap-2'>
                  {RACE_DISTANCE_KEYS.map(key => {
                    const active = distances.includes(key)
                    return (
                      <button
                        key={key}
                        type='button'
                        onClick={() => toggleDistance(key)}
                        aria-pressed={active}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all min-h-11 ${
                          active
                            ? 'bg-stride-yellow-accent/15 border-stride-yellow-accent text-stride-yellow-accent'
                            : 'bg-white/5 border-white/15 text-white/55 hover:border-white/25 hover:text-white/85'
                        }`}
                      >
                        {RACE_DISTANCES[key].label}
                      </button>
                    )
                  })}
                </div>

                {customDistances.length > 0 && (
                  <div className='flex flex-wrap gap-2 mt-3'>
                    {customDistances.map(d => (
                      <span key={d} className='inline-flex items-center gap-1.5 rounded-xl border border-stride-yellow-accent/60 bg-stride-yellow-accent/10 pl-3 pr-1.5 py-1.5 text-xs font-bold text-stride-yellow-accent'>
                        {distanceLabel(d)}
                        <button type='button' onClick={() => toggleDistance(d)} aria-label={`Remove ${d}`} className='p-1 rounded-md hover:bg-white/10'>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className='flex items-center gap-2 mt-4'>
                  <input
                    type='text'
                    value={customDistance}
                    onChange={e => setCustomDistance(e.target.value)}
                    onKeyDown={onCustomDistanceKeyDown}
                    placeholder='Other distance, e.g. 15K or Relay'
                    maxLength={MAX_CUSTOM_DISTANCE_LENGTH}
                    aria-label='Custom distance'
                    className={`${inputBase} flex-1`}
                  />
                  <button
                    type='button'
                    onClick={() => { const problem = addCustomDistance(); if (problem) reportFormError({ message: problem, field: 'distances' }) }}
                    className='inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/15 text-white/70 text-sm hover:border-white/30 hover:text-white transition-colors min-h-11 shrink-0'
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
                <p className='text-white/30 text-xs mt-2'>Pick every distance the race offers. Custom distances appear under the “Other” filter.</p>
              </div>
            </Widget>

            {/* ── REGISTRATION ── */}
            <Widget icon={<Tag size={15} />} title='Registration'>
              <p className='text-white/45 text-xs mb-4'>Add a registration link, a coupon code, or both — runners need at least one.</p>
              <Field
                icon={<Link2 size={14} />} label='Registration link' type='url'
                name='registrationUrl' value={registrationUrl} onChange={setRegistrationUrl}
                placeholder='https://…'
                help="Paste the organiser's registration URL exactly as they gave it, including any tracking parameters."
              />
              <div className='mt-4'>
                <Field
                  icon={<Tag size={14} />} label='Coupon code'
                  name='couponCode' value={couponCode} onChange={setCouponCode}
                  placeholder='e.g. STRIDE10'
                  help={`The organiser's discount code for Stride runners. Shown with a copy button. Up to ${MAX_RACE_COUPON_LENGTH} characters.`}
                />
              </div>
            </Widget>

            {/* ── POSTERS ── */}
            <Widget icon={<ImageIcon size={15} />} title='Poster'>
              <div data-field='posterImages'>
                <p className='text-white/45 text-xs mb-3'>Up to {MAX_RACE_POSTERS} images. The first is the poster shown on cards. Converted to WebP on upload.</p>
                <input ref={posterFileRef} type='file' accept='image/*' multiple className='hidden' onChange={handlePosterFileSelect} />

                <div className='grid grid-cols-3 sm:grid-cols-5 gap-2'>
                  {posterImages.map((url, i) => (
                    <div
                      key={url}
                      draggable
                      onDragStart={() => setImgDragSrc(i)}
                      onDragOver={(e) => { e.preventDefault(); if (i !== imgDragOver) setImgDragOver(i) }}
                      onDrop={() => handleImageDrop(i)}
                      onDragEnd={() => { setImgDragSrc(null); setImgDragOver(null) }}
                      className={`relative aspect-[3/4] rounded-lg overflow-hidden border bg-white/5 group ${
                        imgDragOver === i ? 'border-stride-yellow-accent' : 'border-white/15'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Poster ${i + 1}`} className='w-full h-full object-contain' loading='lazy' />
                      {i === 0 && (
                        <span className='absolute top-1 left-1 rounded bg-stride-yellow-accent px-1.5 py-0.5 text-[9px] font-black text-copy-black'>MAIN</span>
                      )}
                      <span className='absolute bottom-1 left-1 text-white/50 cursor-grab' aria-hidden='true'><GripVertical size={12} /></span>
                      <button
                        type='button'
                        onClick={() => { void removePoster(i) }}
                        aria-label={`Remove poster ${i + 1}`}
                        className='absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors'
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {posterImages.length + pendingUploads.length < MAX_RACE_POSTERS && (
                    <button
                      type='button'
                      onClick={() => posterFileRef.current?.click()}
                      className='aspect-[3/4] rounded-lg border border-dashed border-white/20 text-white/40 hover:border-stride-yellow-accent/50 hover:text-white flex flex-col items-center justify-center gap-1 text-xs transition-colors'
                    >
                      <Plus size={16} /> Add
                    </button>
                  )}
                </div>

                {pendingUploads.length > 0 && (
                  <div className='space-y-2 mt-3'>
                    {pendingUploads.map(u => (
                      <UploadProgress
                        key={u.id}
                        status={u.status}
                        progress={u.progress}
                        message={u.error}
                        onRetry={u.status === 'error' ? () => { void uploadPoster(u.id, u.file) } : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Widget>

            <div className='flex flex-wrap items-center gap-3 pt-2'>
              <SubmitButton label={submitLabel} />
              <button
                type='button'
                onClick={() => setCancelModalOpen(true)}
                className='text-white/60 hover:text-white px-5 py-3 rounded-md border border-white/15 hover:border-white/30 transition-colors text-sm min-h-11 flex items-center'
              >
                Cancel
              </button>
              <button type='button' onClick={handlePreview} className='lg:hidden ml-auto flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors min-h-11'>
                <Eye size={15} />
                Preview
              </button>
            </div>
          </form>
        </div>

        <div
          onMouseDown={onDragStart}
          className='hidden lg:flex w-3 self-stretch items-center justify-center cursor-col-resize group shrink-0 select-none'
          title='Drag to resize'
          aria-hidden='true'
        >
          <div className='w-px h-full bg-white/10 group-hover:bg-stride-yellow-accent/50 transition-colors' />
        </div>

        <div
          style={{ ['--preview-w' as string]: `${100 - formWidthPct}%` } as React.CSSProperties}
          className='hidden lg:block w-(--preview-w) min-w-0 shrink-0 pl-1 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto'
        >
          <RacePreview
            name={name} description={description} raceDate={raceDate} startTime={startTime}
            registrationDeadline={registrationDeadline} city={city} venue={venue} organizer={organizer}
            distances={distances} registrationUrl={registrationUrl} couponCode={couponCode}
            posterImages={posterImages} slug={previewSlug}
          />
        </div>
      </div>
    </>
  )
}
