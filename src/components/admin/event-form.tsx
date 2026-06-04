'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { nanoid } from 'nanoid'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import {
  X, Plus, Eye, ChevronDown, Pencil, GripVertical, Trash2,
  Activity, Calendar, MapPin, Ticket, ImageIcon, AlertTriangle,
  CheckCircle2, PauseCircle, XCircle, Type, Gauge,
  Hash, IndianRupee, Users, Link2, Coffee, Route, Clock, FileText, RotateCcw,
} from 'lucide-react'
import type { EventFormData } from '@/lib/validations/admin'
import type { AdditionalField, AdditionalFieldType } from '@/types/event'
import { Spinner } from '@/components/ui/spinner'
import { UploadProgress } from '@/components/ui/upload-progress'
import { HelpHint } from '@/components/ui/help-hint'
import { EventPreview } from '@/components/admin/event-preview'
import { slugify } from '@/lib/utils/slug'
import { uploadWithProgress } from '@/lib/utils/upload'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

const STORAGE_BASE = 'https://ienotcjldormdxrzukpk.supabase.co'

type Status = 'DRAFT' | 'PUBLISHED' | 'CANCELLED'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type='submit'
      disabled={pending}
      className='bg-stride-yellow-accent text-copy-black font-semibold px-6 py-3 rounded-md hover:bg-stride-yellow-accent/90 transition-colors text-sm min-h-11 flex items-center gap-2 disabled:opacity-70'
    >
      {pending && <Spinner />}
      {pending ? 'Saving…' : label}
    </button>
  )
}

type Props = {
  action: (formData: FormData) => Promise<void>
  defaultValues?: Partial<EventFormData & { eventDate?: string; endDate?: string }>
  submitLabel: string
  errorMessage?: string
}

export function EventForm({ action, defaultValues = {}, submitLabel, errorMessage }: Props) {
  const router = useRouter()

  // Controlled state for live preview
  const [name, setName] = useState(defaultValues.name ?? '')
  const [subtitle, setSubtitle] = useState(defaultValues.subtitle ?? '')
  const [details, setDetails] = useState(defaultValues.details ?? '')
  const [confirmationText, setConfirmationText] = useState(defaultValues.confirmationText ?? '')
  const [termsText, setTermsText] = useState(defaultValues.termsText ?? '')
  const [location, setLocation] = useState(defaultValues.location ?? '')
  const [pricePaise, setPricePaise] = useState(defaultValues.pricePaise ?? 0)
  const [eventDate, setEventDate] = useState(defaultValues.eventDate ?? '')
  const [status, setStatus] = useState<Status>((defaultValues.status as Status) ?? 'DRAFT')
  const [distanceKm, setDistanceKm] = useState<string>(
    defaultValues.distanceKm !== undefined && defaultValues.distanceKm !== null
      ? String(defaultValues.distanceKm)
      : ''
  )
  const [difficulty, setDifficulty] = useState(defaultValues.difficulty ?? '')

  // Cancel confirmation modal — `mounted` flag guards createPortal on SSR
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelModalMounted, setCancelModalMounted] = useState(false)
  useEffect(() => { setCancelModalMounted(true) }, [])

  // Unsaved-changes guard — once true, the browser shows its native
  // "Are you sure you want to leave?" dialog on close/refresh/back.
  const [isDirty, setIsDirty] = useState(false)
  const markDirty = useCallback(() => { setIsDirty(prev => prev || true) }, [])
  useEffect(() => {
    if (!isDirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = '' // required for Chromium to show the native dialog
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  // Banner images
  const bannerFileRef = useRef<HTMLInputElement>(null)
  const [bannerImages, setBannerImages] = useState<string[]>(() => {
    try { return JSON.parse(defaultValues.bannerImages ?? '[]') as string[] }
    catch { return [] }
  })
  // In-flight banner uploads — each tracks its own progress so we can render a
  // per-image progress bar and a retry button if one fails.
  const [pendingUploads, setPendingUploads] = useState<
    { id: string; file: File; progress: number; status: 'uploading' | 'error'; error?: string }[]
  >([])

  // Banner image cropper
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [cropStatus, setCropStatus] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [cropProgress, setCropProgress] = useState(0)
  const [cropError, setCropError] = useState('')
  const cropImgRef = useRef<HTMLImageElement>(null)
  const cropReplacingIndexRef = useRef<number | null>(null)

  // Drag-to-reorder state for banner images
  const [imgDragSrc, setImgDragSrc] = useState<number | null>(null)
  const [imgDragOver, setImgDragOver] = useState<number | null>(null)

  // Additional (custom) fields for the event
  const [additionalFields, setAdditionalFields] = useState<AdditionalField[]>(() => {
    try { return JSON.parse(defaultValues.additionalFields ?? '[]') as AdditionalField[] }
    catch { return [] }
  })
  const [fieldDragSrc, setFieldDragSrc] = useState<number | null>(null)
  const [fieldDragOver, setFieldDragOver] = useState<number | null>(null)

  function addField() {
    setAdditionalFields(prev => [...prev, { id: nanoid(8), label: '', type: 'text', required: false }])
    markDirty()
  }
  function updateField(index: number, patch: Partial<AdditionalField>) {
    setAdditionalFields(prev => prev.map((f, i) => i === index ? { ...f, ...patch } : f))
    markDirty()
  }
  function removeField(index: number) {
    setAdditionalFields(prev => prev.filter((_, i) => i !== index))
    markDirty()
  }
  function handleFieldDragStart(i: number) { setFieldDragSrc(i) }
  function handleFieldDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    if (i !== fieldDragOver) setFieldDragOver(i)
  }
  function handleFieldDrop(i: number) {
    if (fieldDragSrc === null || fieldDragSrc === i) { resetFieldDrag(); return }
    const next = [...additionalFields]
    const [moved] = next.splice(fieldDragSrc, 1)
    next.splice(i, 0, moved)
    setAdditionalFields(next)
    markDirty()
    resetFieldDrag()
  }
  function resetFieldDrag() { setFieldDragSrc(null); setFieldDragOver(null) }

  // Draggable split pane
  const containerRef = useRef<HTMLDivElement>(null)
  const [formWidthPct, setFormWidthPct] = useState(52)

  function onDragStart(e: React.MouseEvent) {
    e.preventDefault()
    function onMouseMove(ev: MouseEvent) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setFormWidthPct(Math.min(Math.max(pct, 30), 70))
    }
    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function openFilePickerForAdd() {
    cropReplacingIndexRef.current = null
    bannerFileRef.current?.click()
  }

  function openCropperForExistingImage(index: number) {
    cropReplacingIndexRef.current = index
    setCropSrc(bannerImages[index])
    setCrop(undefined)
    setCropStatus('idle')
    setCropProgress(0)
    setCropError('')
  }

  async function uploadBanner(id: string, file: File) {
    setPendingUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'uploading', progress: 0, error: undefined } : u))
    try {
      const data = await uploadWithProgress<{ url?: string }>({
        url: '/api/admin/upload-event-cover',
        file,
        fileName: file.name,
        fields: name.trim() ? { eventName: name.trim() } : {},
        onProgress: (p) => setPendingUploads(prev => prev.map(u => u.id === id ? { ...u, progress: p } : u)),
      })
      if (data.url) {
        setBannerImages(prev => [...prev, data.url as string])
        markDirty()
      }
      setPendingUploads(prev => prev.filter(u => u.id !== id))
    } catch (err) {
      setPendingUploads(prev => prev.map(u =>
        u.id === id ? { ...u, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' } : u
      ))
    }
  }

  function handleBannerFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    const slots = 5 - bannerImages.length - pendingUploads.length
    const toUpload = files.slice(0, slots)
    if (toUpload.length === 0) return

    const entries = toUpload.map(file => ({ id: nanoid(8), file, progress: 0, status: 'uploading' as const }))
    setPendingUploads(prev => [...prev, ...entries])
    for (const entry of entries) void uploadBanner(entry.id, entry.file)
  }

  function dismissUpload(id: string) {
    setPendingUploads(prev => prev.filter(u => u.id !== id))
  }

  function handleImageDragStart(i: number) { setImgDragSrc(i) }
  function handleImageDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    if (i !== imgDragOver) setImgDragOver(i)
  }
  function handleImageDrop(i: number) {
    if (imgDragSrc === null || imgDragSrc === i) { resetImageDrag(); return }
    const next = [...bannerImages]
    const [moved] = next.splice(imgDragSrc, 1)
    next.splice(i, 0, moved)
    setBannerImages(next)
    markDirty()
    resetImageDrag()
  }
  function resetImageDrag() { setImgDragSrc(null); setImgDragOver(null) }

  // Seed a centered 3:4 crop when the image loads (event posters are locked to 3:4).
  function onCropImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 3 / 4, width, height), width, height))
  }

  const getCroppedBlob = useCallback((): Promise<Blob | null> => {
    const img = cropImgRef.current
    if (!img) return Promise.resolve(null)

    const canvas = document.createElement('canvas')
    if (!crop || crop.width === 0 || crop.height === 0) {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return Promise.resolve(null)
      ctx.drawImage(img, 0, 0)
      return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    }

    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height
    const unit = crop.unit ?? '%'
    const px = unit === '%' ? (crop.x / 100) * img.width : crop.x
    const py = unit === '%' ? (crop.y / 100) * img.height : crop.y
    const pw = unit === '%' ? (crop.width / 100) * img.width : crop.width
    const ph = unit === '%' ? (crop.height / 100) * img.height : crop.height

    canvas.width = Math.round(pw * scaleX)
    canvas.height = Math.round(ph * scaleY)
    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.resolve(null)
    ctx.drawImage(img, px * scaleX, py * scaleY, pw * scaleX, ph * scaleY, 0, 0, canvas.width, canvas.height)
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  }, [crop])

  const cropBlobRef = useRef<Blob | null>(null)

  async function uploadCropBlob(blob: Blob) {
    setCropStatus('uploading')
    setCropProgress(0)
    setCropError('')
    try {
      const replacingIndex = cropReplacingIndexRef.current
      if (replacingIndex !== null) {
        const oldUrl = bannerImages[replacingIndex]
        if (oldUrl?.startsWith(STORAGE_BASE)) {
          await fetch('/api/admin/delete-event-image', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: oldUrl }),
          })
        }
      }

      const data = await uploadWithProgress<{ url?: string }>({
        url: '/api/admin/upload-event-cover',
        file: blob,
        fileName: 'banner.jpg',
        fields: name.trim() ? { eventName: name.trim() } : {},
        onProgress: setCropProgress,
      })

      if (data.url) {
        if (replacingIndex !== null) {
          setBannerImages(prev => prev.map((u, i) => i === replacingIndex ? data.url as string : u))
        } else {
          setBannerImages(prev => [...prev, data.url as string])
        }
        markDirty()
      }
      setCropStatus('idle')
      setCropSrc(null)
    } catch (err) {
      setCropError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setCropStatus('error')
    }
  }

  async function handleCropSave() {
    const blob = await getCroppedBlob()
    if (!blob) return
    cropBlobRef.current = blob
    await uploadCropBlob(blob)
  }

  function handleCropRetry() {
    if (cropBlobRef.current) void uploadCropBlob(cropBlobRef.current)
  }

  async function removeBannerImage(index: number) {
    const url = bannerImages[index]
    setBannerImages(prev => prev.filter((_, i) => i !== index))
    markDirty()
    if (url?.startsWith(STORAGE_BASE)) {
      await fetch('/api/admin/delete-event-image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
    }
  }

  function handlePreview() {
    const previewData = { name, subtitle, pricePaise, eventDate, location, details, bannerImages, distanceKm, difficulty }
    try { sessionStorage.setItem('event_form_preview', JSON.stringify(previewData)) } catch {}
    window.open('/admin/events/preview', '_blank')
  }

  const previewSlug = name.trim() ? slugify(name) || 'your-event-name' : 'your-event-name'

  return (
    <>
      {/* ── Banner image cropper modal ── */}
      {cropSrc && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6'>
          <div className='bg-stride-purple-primary border border-white/15 rounded-xl p-3 w-full max-w-sm flex flex-col gap-2.5'>
            <p className='text-white/60 text-xs px-1'>Drag to reposition · Fixed 3:4 poster ratio</p>
            <div className='flex justify-center overflow-hidden rounded-lg'>
              <ReactCrop crop={crop} onChange={setCrop} aspect={3 / 4} keepSelection style={{ maxHeight: '50vh', maxWidth: '100%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={cropImgRef}
                  src={cropSrc}
                  alt='Crop preview'
                  crossOrigin='anonymous'
                  onLoad={onCropImageLoad}
                  style={{ maxHeight: '50vh', maxWidth: '100%', display: 'block' }}
                />
              </ReactCrop>
            </div>
            {(cropStatus === 'uploading' || cropStatus === 'error') && (
              <UploadProgress
                status={cropStatus === 'error' ? 'error' : 'uploading'}
                progress={cropProgress}
                message={cropError}
                onRetry={handleCropRetry}
              />
            )}
            <div className='flex gap-2'>
              <button onClick={handleCropSave} disabled={cropStatus === 'uploading'} className='flex-1 bg-stride-yellow-accent text-copy-black font-semibold py-2 rounded-md text-xs disabled:opacity-60 flex items-center justify-center gap-1.5'>
                {cropStatus === 'uploading' ? <><Spinner /> Uploading…</> : 'Save image'}
              </button>
              <button onClick={() => setCropSrc(null)} disabled={cropStatus === 'uploading'} className='px-3 py-2 rounded-md border border-white/15 text-white/70 text-xs hover:border-white/30 disabled:opacity-50'>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel confirmation modal (portal) ── */}
      {cancelModalOpen && cancelModalMounted && createPortal(
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4' onClick={() => setCancelModalOpen(false)}>
          <div className='bg-stride-purple-primary border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='w-12 h-12 rounded-full bg-stride-yellow-accent/15 flex items-center justify-center mb-4'>
              <AlertTriangle size={20} className='text-stride-yellow-accent' />
            </div>
            <h2 className='text-white font-bold text-lg mb-1'>Discard your changes?</h2>
            <p className='text-white/60 text-sm mb-1'>Anything you&apos;ve typed here will be lost.</p>
            <p className='text-white/40 text-xs mb-6'>This action cannot be undone.</p>
            <div className='flex gap-3'>
              <button onClick={() => setCancelModalOpen(false)} className='flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 text-sm hover:border-white/30 transition-colors'>
                Keep editing
              </button>
              <button onClick={() => router.push('/admin/events')} className='flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors'>
                Yes, discard
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Split pane container ── */}
      <div ref={containerRef} className='flex items-start flex-col lg:flex-row'>

        {/* ── Left: Form ── width=100% on mobile, dynamic % on lg+ */}
        <div
          style={{ ['--form-w' as string]: `${formWidthPct}%` } as React.CSSProperties}
          className='w-full lg:w-(--form-w) lg:shrink-0 min-w-0'
        >
          <form
            action={action}
            onSubmit={() => setIsDirty(false)}
            onInput={markDirty}
            className='space-y-5 lg:pr-2'
          >

            {errorMessage && (
              <div className='bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm'>
                {errorMessage}
              </div>
            )}

            {/* Hidden inputs */}
            <input type='hidden' name='details' value={details} />
            <input type='hidden' name='confirmationText' value={confirmationText} />
            <input type='hidden' name='termsText' value={termsText} />
            <input type='hidden' name='bannerImages' value={JSON.stringify(bannerImages)} readOnly />
            <input type='hidden' name='additionalFields' value={JSON.stringify(additionalFields)} readOnly />
            <input type='hidden' name='status' value={status} />

            {/* ── STATUS PILLS ── */}
            <div className='bg-white/4 border border-white/10 rounded-2xl px-4 py-4 sm:px-5 sm:py-5'>
              <div className='flex items-center gap-2 mb-3'>
                <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest'>Event status</p>
                <HelpHint text='PUBLISHED: visible to everyone on /events. DRAFT: visible only in admin. CANCELLED: shown in admin with a red badge, hidden from runners.' />
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

            {/* ── WHAT ── */}
            <Widget icon={<Activity size={15} />} title='What'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Field
                  icon={<Type size={14} />} label='Event name' required
                  name='name' value={name} onChange={setName}
                  placeholder='e.g. Sunday Trail Run'
                  help='The big public name runners see.'
                />
                <Field
                  icon={<Hash size={14} />} label='Subtitle'
                  name='subtitle' value={subtitle} onChange={setSubtitle}
                  placeholder='e.g. 5K & 10K · Cubbon Park'
                  help='Short tagline shown under the title.'
                />
              </div>

              <div className='flex flex-col gap-1.5 mt-4'>
                <div className='flex items-center gap-1.5'>
                  <FileText size={14} className='text-white/40' />
                  <label className='text-white/70 text-sm font-medium'>Full details</label>
                  <HelpHint text='The long-form description of the event. Supports headings, lists, links, bold. Shown in the "About the experience" section on the public page.' />
                </div>
                <div data-color-mode='dark' className='rounded-lg overflow-hidden border border-white/20'>
                  <MDEditor value={details} onChange={(v) => { setDetails(v ?? ''); markDirty() }} height={260} preview='edit' className='bg-transparent!' />
                </div>
              </div>
            </Widget>

            {/* ── WHEN ── */}
            <Widget icon={<Calendar size={15} />} title='When'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Field
                  icon={<Calendar size={14} />} label='Start date & time'
                  name='eventDate' type='datetime-local' value={eventDate} onChange={setEventDate}
                  help='When the run starts. Picked in your local timezone.'
                />
                <Field
                  icon={<Clock size={14} />} label='End date & time'
                  name='endDate' type='datetime-local' defaultValue={defaultValues.endDate}
                  help='Roughly when the event wraps up. Used to mark runs as happening live or completed.'
                />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
                <Field
                  icon={<Users size={14} />} label='Capacity'
                  name='capacity' type='number' defaultValue={String(defaultValues.capacity ?? '')}
                  placeholder='e.g. 50'
                  help='Max number of runners. Leave blank for unlimited.'
                />
                <div className='flex flex-col gap-1.5'>
                  <div className='flex items-center gap-1.5'>
                    <IndianRupee size={14} className='text-white/40' />
                    <label className='text-white/70 text-sm font-medium'>Price (paise)</label>
                    <HelpHint text='Amount in paise. 100 paise = ₹1. Set to 0 for free events.' />
                  </div>
                  <input
                    type='number'
                    name='pricePaise'
                    value={pricePaise}
                    onChange={e => setPricePaise(Number(e.target.value))}
                    placeholder='0 for free'
                    className={`${inputBase} scheme-dark`}
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
                <Field
                  icon={<Gauge size={14} />} label='Distance (km)'
                  name='distanceKm' type='number' value={distanceKm} onChange={setDistanceKm}
                  placeholder='e.g. 5'
                  help='Total run distance in kilometres. Shown as a badge on the event page.'
                />
                <Field
                  icon={<Activity size={14} />} label='Difficulty / pace'
                  name='difficulty' value={difficulty} onChange={setDifficulty}
                  placeholder='e.g. Beginner · 6:30/km'
                  help='Brief skill or pace tag. Free text — anything that helps runners self-select.'
                />
              </div>
            </Widget>

            {/* ── WHERE ── */}
            <Widget icon={<MapPin size={15} />} title='Where'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Field
                  icon={<MapPin size={14} />} label='Location name'
                  name='location' value={location} onChange={setLocation}
                  placeholder='e.g. Cubbon Park'
                  help='The neighbourhood or park name shown on the event page.'
                />
                <Field
                  icon={<Link2 size={14} />} label='Meeting point — Google Maps URL'
                  name='locationUrl' type='url' defaultValue={defaultValues.locationUrl}
                  placeholder='https://maps.google.com/...'
                  help='Pin the exact start spot. Powers the embedded map on the event page.'
                />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
                <Field
                  icon={<Coffee size={14} />} label='Post-run gather URL'
                  name='postRunLocationUrl' type='url' defaultValue={defaultValues.postRunLocationUrl}
                  placeholder='https://maps.google.com/...'
                  help='Where runners hang out after — café, breakfast spot, etc.'
                />
                <Field
                  icon={<Route size={14} />} label='Run route URL'
                  name='stravaRouteUrl' type='url' defaultValue={defaultValues.stravaRouteUrl}
                  placeholder='Strava / Komoot route link'
                  help='Embed-able route link. Shown as a clickable card on the event page.'
                />
              </div>
            </Widget>

            {/* ── REGISTRATION ── */}
            <Widget icon={<Ticket size={15} />} title='Registration'>
              <div className='flex flex-col gap-1.5'>
                <div className='flex items-center gap-1.5'>
                  <FileText size={14} className='text-white/40' />
                  <label className='text-white/70 text-sm font-medium'>Confirmation text</label>
                  <HelpHint text='Shown to the runner after they finish registration. Markdown supported.' />
                </div>
                <div data-color-mode='dark' className='rounded-lg overflow-hidden border border-white/20'>
                  <MDEditor value={confirmationText} onChange={(v) => { setConfirmationText(v ?? ''); markDirty() }} height={160} preview='edit' className='bg-transparent!' />
                </div>
              </div>

              {/* Terms & conditions */}
              <div className='flex flex-col gap-1.5 mt-4'>
                <div className='flex items-center gap-1.5'>
                  <FileText size={14} className='text-white/40' />
                  <label className='text-white/70 text-sm font-medium'>Terms &amp; conditions</label>
                  <HelpHint text='Shown to runners above the confirm button when they register. They must tick a checkbox to accept before they can register. Markdown supported.' />
                </div>
                <div data-color-mode='dark' className='rounded-lg overflow-hidden border border-white/20'>
                  <MDEditor value={termsText} onChange={(v) => { setTermsText(v ?? ''); markDirty() }} height={160} preview='edit' className='bg-transparent!' />
                </div>
              </div>

              {/* Additional fields */}
              <div className='flex flex-col gap-2 mt-4'>
                <div className='flex items-center gap-1.5'>
                  <Plus size={14} className='text-white/40' />
                  <label className='text-white/70 text-sm font-medium'>Custom questions</label>
                  <HelpHint text='Extra questions runners must answer to register — e.g. "T-shirt size", "Strava handle". Drag to reorder. Answers stored on each registration.' />
                </div>

                <div className='flex flex-col gap-2'>
                  {additionalFields.map((field, i) => {
                    const isOver = fieldDragOver === i && fieldDragSrc !== i
                    const isDragging = fieldDragSrc === i
                    return (
                      <div
                        key={field.id}
                        draggable
                        onDragStart={() => handleFieldDragStart(i)}
                        onDragOver={e => handleFieldDragOver(e, i)}
                        onDrop={() => handleFieldDrop(i)}
                        onDragEnd={resetFieldDrag}
                        className={`flex items-start gap-2 p-2 rounded-lg border transition-all ${
                          isOver
                            ? 'border-stride-yellow-accent bg-stride-yellow-accent/5'
                            : isDragging
                            ? 'border-white/10 opacity-40'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <button type='button' className='shrink-0 mt-2.5 text-white/30 hover:text-white/60 cursor-grab active:cursor-grabbing' aria-label='Drag to reorder'>
                          <GripVertical size={16} />
                        </button>

                        <div className='flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2'>
                          <input
                            type='text'
                            value={field.label}
                            onChange={e => updateField(i, { label: e.target.value })}
                            placeholder='e.g. T-shirt size'
                            className={inputBase}
                          />
                          <div className='relative'>
                            <select
                              value={field.type}
                              onChange={e => updateField(i, { type: e.target.value as AdditionalFieldType })}
                              className={`${inputBase} appearance-none pr-8 cursor-pointer`}
                            >
                              <option value='text'>Text</option>
                              <option value='number'>Number</option>
                              <option value='link'>Link</option>
                            </select>
                            <ChevronDown size={14} className='absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none' />
                          </div>
                          <label className='flex items-center gap-2 px-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:border-white/20'>
                            <input
                              type='checkbox'
                              checked={field.required}
                              onChange={e => updateField(i, { required: e.target.checked })}
                              className='accent-stride-yellow-accent w-3.5 h-3.5'
                            />
                            <span className='text-white/70 text-xs whitespace-nowrap'>Required</span>
                          </label>
                        </div>

                        <button type='button' onClick={() => removeField(i)} className='shrink-0 mt-2 p-1.5 rounded-lg text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-colors' aria-label='Remove field'>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                <button type='button' onClick={addField} className='self-start flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-white/20 hover:border-stride-yellow-accent/50 text-white/50 hover:text-white/80 text-xs transition-colors'>
                  <Plus size={13} />
                  Add field
                </button>
              </div>
            </Widget>

            {/* ── IMAGES ── */}
            <Widget icon={<ImageIcon size={15} />} title='Images'>
              <div className='flex items-center gap-1.5 mb-2'>
                <label className='text-white/70 text-sm font-medium'>Banner images</label>
                <HelpHint text='Up to 5 images. First image is the thumbnail and Open Graph preview. Drag to reorder, pencil to crop, X to remove.' />
              </div>
              <p className='text-white/30 text-xs mb-3'>Select multiple at once · Drag to reorder · Pencil to crop</p>
              <div className='flex flex-wrap gap-3 items-end'>
                {bannerImages.map((url, i) => (
                  <div
                    key={url}
                    draggable
                    onDragStart={() => handleImageDragStart(i)}
                    onDragOver={e => handleImageDragOver(e, i)}
                    onDrop={() => handleImageDrop(i)}
                    onDragEnd={resetImageDrag}
                    className={`relative rounded-xl overflow-hidden border group h-28 cursor-grab active:cursor-grabbing transition-all ${
                      imgDragOver === i && imgDragSrc !== i
                        ? 'border-stride-yellow-accent scale-105'
                        : imgDragSrc === i
                          ? 'border-white/15 opacity-40'
                          : 'border-white/15'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Banner ${i + 1}`} className='h-28 w-auto max-w-[220px] block object-contain bg-white/5' />
                    <button type='button' onClick={() => openCropperForExistingImage(i)} className='absolute top-1.5 left-1.5 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-stride-yellow-accent hover:text-copy-black' aria-label='Crop image'>
                      <Pencil size={11} />
                    </button>
                    <button type='button' onClick={() => removeBannerImage(i)} className='absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80' aria-label='Remove image'>
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {pendingUploads.map((u) => (
                  <div key={u.id} className='h-28 w-28 rounded-xl border border-white/15 bg-white/5 flex flex-col items-center justify-center gap-2 shrink-0 px-2'>
                    {u.status === 'error' ? (
                      <>
                        <p className='text-red-400 text-[10px] text-center leading-tight line-clamp-2'>{u.error ?? 'Upload failed'}</p>
                        <div className='flex gap-1.5'>
                          <button type='button' onClick={() => uploadBanner(u.id, u.file)} className='inline-flex items-center gap-1 bg-stride-yellow-accent text-copy-black text-[10px] font-semibold px-2 py-1 rounded-md hover:bg-stride-yellow-accent/90'>
                            <RotateCcw size={10} /> Retry
                          </button>
                          <button type='button' onClick={() => dismissUpload(u.id)} className='p-1 rounded-md text-white/40 hover:text-red-400' aria-label='Dismiss'>
                            <X size={11} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Spinner />
                        <div className='w-full px-1'>
                          <div className='h-1.5 rounded-full bg-white/10 overflow-hidden'>
                            <div className='h-full bg-stride-yellow-accent rounded-full transition-[width] duration-200' style={{ width: `${u.progress}%` }} />
                          </div>
                          <span className='block text-white/40 text-[10px] text-center mt-1 tabular-nums'>{u.progress}%</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {bannerImages.length + pendingUploads.length < 5 && (
                  <button type='button' onClick={openFilePickerForAdd} disabled={pendingUploads.some(u => u.status === 'uploading')} className='h-28 w-20 rounded-xl border-2 border-dashed border-white/20 hover:border-stride-yellow-accent/50 text-white/40 hover:text-white/60 transition-colors flex flex-col items-center justify-center gap-1 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed'>
                    <Plus size={20} />
                    <span className='text-xs'>Add</span>
                  </button>
                )}
              </div>
              <input ref={bannerFileRef} type='file' accept='image/*' multiple onChange={handleBannerFileSelect} className='hidden' />
            </Widget>

            {/* Actions */}
            <div className='flex flex-wrap items-center gap-3 pt-2'>
              <SubmitButton label={submitLabel} />
              <button
                type='button'
                onClick={() => setCancelModalOpen(true)}
                className='text-white/60 hover:text-white px-5 py-3 rounded-md border border-white/15 hover:border-white/30 transition-colors text-sm min-h-11 flex items-center'
              >
                Cancel
              </button>
              <button type='button' onClick={handlePreview} className='lg:hidden ml-auto flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors'>
                <Eye size={15} />
                Preview
              </button>
            </div>
          </form>
        </div>

        {/* ── Drag handle (desktop only) ── */}
        <div
          onMouseDown={onDragStart}
          className='hidden lg:flex w-3 self-stretch items-center justify-center cursor-col-resize group shrink-0 select-none'
          title='Drag to resize'
          aria-hidden='true'
        >
          <div className='w-px h-full bg-white/10 group-hover:bg-stride-yellow-accent/50 transition-colors' />
        </div>

        {/* ── Right: Live Preview (desktop only) ── */}
        <div
          style={{ ['--preview-w' as string]: `${100 - formWidthPct}%` } as React.CSSProperties}
          className='hidden lg:block w-(--preview-w) min-w-0 shrink-0 pl-1 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto'
        >
          <EventPreview
            name={name}
            subtitle={subtitle}
            pricePaise={pricePaise}
            eventDate={eventDate}
            location={location}
            details={details}
            bannerImages={bannerImages}
            slug={previewSlug}
            distanceKm={distanceKm}
            difficulty={difficulty}
          />
        </div>
      </div>
    </>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const inputBase =
  'bg-white/8 border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/70 focus:bg-white/10 transition-colors w-full'

function Widget({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className='bg-white/4 border border-white/10 rounded-2xl px-4 py-4 sm:px-5 sm:py-5'>
      <div className='flex items-center gap-2 mb-4'>
        <span className='inline-flex w-7 h-7 rounded-lg bg-stride-yellow-accent/10 text-stride-yellow-accent items-center justify-center'>
          {icon}
        </span>
        <h2 className='text-white font-bold text-sm font-mono uppercase tracking-widest'>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function StatusPill({
  active, onClick, icon, label, tone,
}: { value: Status; active: boolean; onClick: () => void; icon: React.ReactNode; label: string; tone: 'green' | 'yellow' | 'red' }) {
  const activeStyles =
    tone === 'green'
      ? 'bg-green-500/15 border-green-500 text-green-400 shadow-[0_0_0_3px_rgba(34,197,94,0.10)]'
      : tone === 'yellow'
      ? 'bg-stride-yellow-accent/15 border-stride-yellow-accent text-stride-yellow-accent shadow-[0_0_0_3px_rgba(225,208,63,0.10)]'
      : 'bg-red-500/15 border-red-500 text-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.10)]'

  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
        active
          ? activeStyles
          : 'bg-white/5 border-white/15 text-white/55 hover:border-white/25 hover:text-white/85'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

type FieldProps = {
  icon?: React.ReactNode
  label: string
  name: string
  type?: string
  as?: 'input' | 'textarea'
  defaultValue?: string
  value?: string
  onChange?: (v: string) => void
  required?: boolean
  rows?: number
  placeholder?: string
  help?: string
}

function Field({ icon, label, name, type = 'text', as = 'input', defaultValue = '', value, onChange, required, rows, placeholder, help }: FieldProps) {
  const controlled = value !== undefined && onChange !== undefined
  return (
    <div className='flex flex-col gap-1.5 min-w-0'>
      <div className='flex items-center gap-1.5'>
        {icon && <span className='text-white/40'>{icon}</span>}
        <label className='text-white/70 text-sm font-medium'>
          {label}
          {required && <span className='text-stride-yellow-accent ml-0.5'>*</span>}
        </label>
        {help && <HelpHint text={help} />}
      </div>
      {as === 'textarea' ? (
        <textarea
          name={name}
          defaultValue={controlled ? undefined : defaultValue}
          value={controlled ? value : undefined}
          onChange={controlled ? e => onChange(e.target.value) : undefined}
          required={required}
          rows={rows ?? 3}
          placeholder={placeholder}
          className={inputBase}
        />
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={controlled ? undefined : defaultValue}
          value={controlled ? value : undefined}
          onChange={controlled ? e => onChange(e.target.value) : undefined}
          required={required}
          placeholder={placeholder}
          className={`${inputBase} scheme-dark`}
        />
      )}
    </div>
  )
}
