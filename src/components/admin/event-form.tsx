'use client'

import { useRef, useState, useCallback } from 'react'
import { useFormStatus } from 'react-dom'
import dynamic from 'next/dynamic'
import ReactCrop, { type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Plus, Eye, ChevronDown, Pencil } from 'lucide-react'
import type { EventFormData } from '@/lib/validations/admin'
import { Spinner } from '@/components/ui/spinner'
import { EventPreview } from '@/components/admin/event-preview'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

const STORAGE_BASE = 'https://ienotcjldormdxrzukpk.supabase.co'

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
  // Controlled state for live preview
  const [name, setName] = useState(defaultValues.name ?? '')
  const [subtitle, setSubtitle] = useState(defaultValues.subtitle ?? '')
  const [details, setDetails] = useState(defaultValues.details ?? '')
  const [confirmationText, setConfirmationText] = useState(defaultValues.confirmationText ?? '')
  const [location, setLocation] = useState(defaultValues.location ?? '')
  const [pricePaise, setPricePaise] = useState(defaultValues.pricePaise ?? 0)
  const [eventDate, setEventDate] = useState(defaultValues.eventDate ?? '')

  // Banner images
  const bannerFileRef = useRef<HTMLInputElement>(null)
  const [bannerImages, setBannerImages] = useState<string[]>(() => {
    try { return JSON.parse(defaultValues.bannerImages ?? '[]') as string[] }
    catch { return [] }
  })
  // number of batch-upload jobs still in flight (0 = idle)
  const [uploadingCount, setUploadingCount] = useState(0)

  // Banner image cropper
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [cropUploading, setCropUploading] = useState(false)
  const cropImgRef = useRef<HTMLImageElement>(null)
  const cropReplacingIndexRef = useRef<number | null>(null)

  // Drag-to-reorder state for banner images
  const [imgDragSrc, setImgDragSrc] = useState<number | null>(null)
  const [imgDragOver, setImgDragOver] = useState<number | null>(null)

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

  // Opens the crop modal directly with the already-uploaded image
  function openCropperForExistingImage(index: number) {
    cropReplacingIndexRef.current = index
    setCropSrc(bannerImages[index])
    setCrop(undefined)
  }

  function handleBannerFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    // Upload all selected files directly (no cropper for batch adds)
    const slots = 5 - bannerImages.length
    const toUpload = files.slice(0, slots)
    if (toUpload.length === 0) return
    setUploadingCount(toUpload.length)

    void (async () => {
      const uploaded: string[] = []
      for (const file of toUpload) {
        const form = new FormData()
        form.append('file', file)
        if (name.trim()) form.append('eventName', name.trim())
        const res = await fetch('/api/admin/upload-event-cover', { method: 'POST', body: form })
        const data = await res.json() as { url?: string; error?: string }
        if (res.ok && data.url) {
          uploaded.push(data.url)
        }
        setUploadingCount(prev => prev - 1)
      }
      if (uploaded.length > 0) {
        setBannerImages(prev => [...prev, ...uploaded])
      }
    })()
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
    resetImageDrag()
  }
  function resetImageDrag() { setImgDragSrc(null); setImgDragOver(null) }

  const getCroppedBlob = useCallback((): Promise<Blob | null> => {
    const img = cropImgRef.current
    if (!img) return Promise.resolve(null)

    const canvas = document.createElement('canvas')

    if (!crop || crop.width === 0 || crop.height === 0) {
      // No selection — use full natural image
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

  async function handleCropSave() {
    const blob = await getCroppedBlob()
    if (!blob) return
    setCropUploading(true)
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

      const form = new FormData()
      form.append('file', blob, 'banner.jpg')
      if (name.trim()) form.append('eventName', name.trim())
      const res = await fetch('/api/admin/upload-event-cover', { method: 'POST', body: form })
      const data = await res.json()

      if (res.ok && data.url) {
        if (replacingIndex !== null) {
          setBannerImages(prev => prev.map((u, i) => i === replacingIndex ? data.url as string : u))
        } else {
          setBannerImages(prev => [...prev, data.url as string])
        }
      } else {
        alert((data as { error?: string }).error ?? 'Upload failed')
      }
    } finally {
      setCropUploading(false)
      setCropSrc(null)
    }
  }

  async function removeBannerImage(index: number) {
    const url = bannerImages[index]
    setBannerImages(prev => prev.filter((_, i) => i !== index))
    if (url?.startsWith(STORAGE_BASE)) {
      await fetch('/api/admin/delete-event-image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
    }
  }

  function handlePreview() {
    const previewData = { name, subtitle, pricePaise, eventDate, location, details, bannerImages }
    try { sessionStorage.setItem('event_form_preview', JSON.stringify(previewData)) } catch {}
    window.open('/admin/events/preview', '_blank')
  }

  return (
    <>
      {/* ── Banner image cropper modal ── */}
      {cropSrc && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6'>
          <div className='bg-stride-purple-primary border border-white/15 rounded-xl p-3 w-full max-w-sm flex flex-col gap-2.5'>
            <p className='text-white/60 text-xs px-1'>Drag to crop · Save as-is for full image</p>
            <div className='flex justify-center overflow-hidden rounded-lg'>
              <ReactCrop crop={crop} onChange={setCrop} style={{ maxHeight: '50vh', maxWidth: '100%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={cropImgRef}
                  src={cropSrc}
                  alt='Crop preview'
                  crossOrigin='anonymous'
                  style={{ maxHeight: '50vh', maxWidth: '100%', display: 'block' }}
                />
              </ReactCrop>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={handleCropSave}
                disabled={cropUploading}
                className='flex-1 bg-stride-yellow-accent text-copy-black font-semibold py-2 rounded-md text-xs disabled:opacity-60 flex items-center justify-center gap-1.5'
              >
                {cropUploading ? <><Spinner /> Uploading…</> : 'Save image'}
              </button>
              <button
                onClick={() => setCropSrc(null)}
                disabled={cropUploading}
                className='px-3 py-2 rounded-md border border-white/15 text-white/70 text-xs hover:border-white/30 disabled:opacity-50'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Split pane container ── */}
      <div ref={containerRef} className='flex items-start'>

        {/* ── Left: Form ── */}
        <div style={{ width: `${formWidthPct}%` }} className='min-w-0 shrink-0'>
          <form action={action} className='space-y-5 pr-2'>

            {errorMessage && (
              <div className='bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm'>
                {errorMessage}
              </div>
            )}

            {/* Hidden fields for controlled markdown values */}
            <input type='hidden' name='details' value={details} />
            <input type='hidden' name='confirmationText' value={confirmationText} />
            <input type='hidden' name='bannerImages' value={JSON.stringify(bannerImages)} readOnly />

            {/* Name + Subtitle */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <Field label='Event name *' name='name' value={name} onChange={setName} required />
              <Field label='Subtitle' name='subtitle' value={subtitle} onChange={setSubtitle} />
            </div>

            {/* Full details — markdown editor */}
            <div className='flex flex-col gap-1.5'>
              <label className='text-white/70 text-sm font-medium'>Full details</label>
              <div data-color-mode='dark' className='rounded-lg overflow-hidden border border-white/20'>
                <MDEditor value={details} onChange={(v) => setDetails(v ?? '')} height={280} preview='edit' className='bg-transparent!' />
              </div>
              <p className='text-white/30 text-xs'>Markdown supported — headings, bold, lists, links</p>
            </div>

            {/* Location + Meeting point URL */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <Field label='Location name' name='location' value={location} onChange={setLocation} />
              <Field label='Meeting point — Google Maps URL' name='locationUrl' type='url' defaultValue={defaultValues.locationUrl} />
            </div>

            {/* Post-run gather point */}
            <Field label='Post-run gather point — Google Maps URL' name='postRunLocationUrl' type='url' defaultValue={defaultValues.postRunLocationUrl} />

            {/* Run route */}
            <Field label='Run route URL (Strava / Komoot / etc.)' name='stravaRouteUrl' type='url' defaultValue={defaultValues.stravaRouteUrl} />

            {/* Dates */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <Field label='Start date & time' name='eventDate' type='datetime-local' value={eventDate} onChange={setEventDate} />
              <Field label='End date & time' name='endDate' type='datetime-local' defaultValue={defaultValues.endDate} />
            </div>

            {/* Capacity / Price / Status */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <Field label='Capacity' name='capacity' type='number' defaultValue={String(defaultValues.capacity ?? '')} />
              <div className='flex flex-col gap-1.5'>
                <label className='text-white/70 text-sm font-medium'>Price (paise) — 0 = free</label>
                <input
                  type='number'
                  name='pricePaise'
                  value={pricePaise}
                  onChange={e => setPricePaise(Number(e.target.value))}
                  className={inputBase}
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-white/70 text-sm font-medium'>Status</label>
                <div className='relative'>
                  <select
                    name='status'
                    defaultValue={defaultValues.status ?? 'DRAFT'}
                    className={`${inputBase} appearance-none pr-9 cursor-pointer`}
                  >
                    <option value='DRAFT'>Draft</option>
                    <option value='PUBLISHED'>Published</option>
                    <option value='CANCELLED'>Cancelled</option>
                  </select>
                  <ChevronDown size={15} className='absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none' />
                </div>
              </div>
            </div>

            {/* Confirmation text — markdown editor */}
            <div className='flex flex-col gap-1.5'>
              <label className='text-white/70 text-sm font-medium'>Registration confirmation text</label>
              <div data-color-mode='dark' className='rounded-lg overflow-hidden border border-white/20'>
                <MDEditor value={confirmationText} onChange={(v) => setConfirmationText(v ?? '')} height={180} preview='edit' className='bg-transparent!' />
              </div>
              <p className='text-white/30 text-xs'>Markdown supported — shown to the member after booking</p>
            </div>

            {/* Banner images */}
            <div className='flex flex-col gap-2'>
              <div>
                <label className='text-white/70 text-sm font-medium'>Banner images</label>
                <p className='text-white/30 text-xs mt-0.5'>Select multiple at once · Up to 5 total · Drag to reorder · Pencil to crop</p>
              </div>
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
                    {/* Crop / edit pencil */}
                    <button
                      type='button'
                      onClick={() => openCropperForExistingImage(i)}
                      className='absolute top-1.5 left-1.5 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-stride-yellow-accent hover:text-copy-black'
                      aria-label='Crop image'
                    >
                      <Pencil size={11} />
                    </button>
                    {/* Remove */}
                    <button
                      type='button'
                      onClick={() => removeBannerImage(i)}
                      className='absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80'
                      aria-label='Remove image'
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {/* Uploading placeholders */}
                {Array.from({ length: uploadingCount }).map((_, i) => (
                  <div key={`uploading-${i}`} className='h-28 w-20 rounded-xl border border-white/15 bg-white/5 flex flex-col items-center justify-center gap-1 shrink-0'>
                    <Spinner />
                    <span className='text-white/30 text-xs'>Uploading</span>
                  </div>
                ))}
                {bannerImages.length + uploadingCount < 5 && (
                  <button
                    type='button'
                    onClick={openFilePickerForAdd}
                    disabled={uploadingCount > 0}
                    className='h-28 w-20 rounded-xl border-2 border-dashed border-white/20 hover:border-stride-yellow-accent/50 text-white/40 hover:text-white/60 transition-colors flex flex-col items-center justify-center gap-1 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed'
                  >
                    <Plus size={20} />
                    <span className='text-xs'>Add</span>
                  </button>
                )}
              </div>
              <input
                ref={bannerFileRef}
                type='file'
                accept='image/*'
                multiple
                onChange={handleBannerFileSelect}
                className='hidden'
              />
            </div>

            {/* Actions */}
            <div className='flex flex-wrap items-center gap-3 pt-2'>
              <SubmitButton label={submitLabel} />
              <a
                href='/admin/events'
                className='text-white/60 hover:text-white px-5 py-3 rounded-md border border-white/15 hover:border-white/30 transition-colors text-sm min-h-11 flex items-center'
              >
                Cancel
              </a>
              <button
                type='button'
                onClick={handlePreview}
                className='lg:hidden ml-auto flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors'
              >
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
        <div style={{ width: `${100 - formWidthPct}%` }} className='hidden lg:block min-w-0 shrink-0 pl-1 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto'>
          <EventPreview
            name={name}
            subtitle={subtitle}
            pricePaise={pricePaise}
            eventDate={eventDate}
            location={location}
            details={details}
            bannerImages={bannerImages}
          />
        </div>
      </div>
    </>
  )
}

const inputBase =
  'bg-white/8 border border-white/20 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/70 focus:bg-white/10 transition-colors w-full'

type FieldProps = {
  label: string
  name: string
  type?: string
  as?: 'input' | 'textarea'
  defaultValue?: string
  value?: string
  onChange?: (v: string) => void
  required?: boolean
  rows?: number
}

function Field({ label, name, type = 'text', as = 'input', defaultValue = '', value, onChange, required, rows }: FieldProps) {
  const controlled = value !== undefined && onChange !== undefined
  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-white/70 text-sm font-medium'>{label}</label>
      {as === 'textarea' ? (
        <textarea
          name={name}
          defaultValue={controlled ? undefined : defaultValue}
          value={controlled ? value : undefined}
          onChange={controlled ? e => onChange(e.target.value) : undefined}
          required={required}
          rows={rows ?? 3}
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
          className={`${inputBase} scheme-dark`}
        />
      )}
    </div>
  )
}
