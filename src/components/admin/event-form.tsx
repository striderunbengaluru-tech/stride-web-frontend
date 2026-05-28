'use client'

import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Image from 'next/image'
import { Upload, X, Plus } from 'lucide-react'
import type { EventFormData } from '@/lib/validations/admin'
import { Spinner } from '@/components/ui/spinner'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type='submit'
      disabled={pending}
      className='bg-stride-yellow-accent text-copy-black font-semibold px-6 py-2.5 rounded-md hover:bg-stride-yellow-accent/90 transition-colors text-sm min-h-11 flex items-center gap-2 disabled:opacity-70'
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
}

export function EventForm({ action, defaultValues = {}, submitLabel }: Props) {
  // Cover image
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hiddenCoverRef = useRef<HTMLInputElement>(null)
  const [coverPreview, setCoverPreview] = useState<string>(defaultValues.coverUrl ?? '')
  const [uploadingCover, setUploadingCover] = useState(false)

  // Banner images (JSON array)
  const bannerFileRef = useRef<HTMLInputElement>(null)
  const [bannerImages, setBannerImages] = useState<string[]>(() => {
    try { return JSON.parse(defaultValues.bannerImages ?? '[]') as string[] }
    catch { return [] }
  })
  const [uploadingBanner, setUploadingBanner] = useState(false)

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverPreview(URL.createObjectURL(file))
    setUploadingCover(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload-event-cover', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok && data.url) {
        setCoverPreview(data.url)
        if (hiddenCoverRef.current) hiddenCoverRef.current.value = data.url
      } else {
        alert(data.error ?? 'Upload failed')
        setCoverPreview(defaultValues.coverUrl ?? '')
      }
    } finally {
      setUploadingCover(false)
    }
  }

  async function handleBannerAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || bannerImages.length >= 5) return
    setUploadingBanner(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload-event-cover', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok && data.url) {
        setBannerImages(prev => [...prev, data.url])
      } else {
        alert(data.error ?? 'Upload failed')
      }
    } finally {
      setUploadingBanner(false)
      if (bannerFileRef.current) bannerFileRef.current.value = ''
    }
  }

  function removeBannerImage(index: number) {
    setBannerImages(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <form action={action} className='space-y-5'>
      {/* Hidden fields */}
      <input ref={hiddenCoverRef} type='hidden' name='coverUrl' defaultValue={defaultValues.coverUrl ?? ''} />
      <input type='hidden' name='bannerImages' value={JSON.stringify(bannerImages)} readOnly />

      {/* Name + Subtitle */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
        <Field label='Event Name *' name='name' defaultValue={defaultValues.name} required />
        <Field label='Subtitle' name='subtitle' defaultValue={defaultValues.subtitle} />
      </div>

      {/* Short description */}
      <Field
        label='Short Description'
        name='description'
        as='textarea'
        defaultValue={defaultValues.description}
        rows={2}
      />

      {/* Full details */}
      <Field
        label='Full Details (Markdown)'
        name='details'
        as='textarea'
        defaultValue={defaultValues.details}
        rows={6}
      />

      {/* Location + Meeting point map */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
        <Field label='Location Name' name='location' defaultValue={defaultValues.location} />
        <Field label='Meeting Point — Google Maps URL' name='locationUrl' type='url' defaultValue={defaultValues.locationUrl} />
      </div>

      {/* Post-run gather point */}
      <Field
        label='Post Run Gather Point — Google Maps URL'
        name='postRunLocationUrl'
        type='url'
        defaultValue={defaultValues.postRunLocationUrl}
      />

      {/* Run route */}
      <Field label='Run Route URL (Strava / Komoot / etc.)' name='stravaRouteUrl' type='url' defaultValue={defaultValues.stravaRouteUrl} />

      {/* Dates */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
        <Field label='Start Date & Time' name='eventDate' type='datetime-local' defaultValue={defaultValues.eventDate} />
        <Field label='End Date & Time' name='endDate' type='datetime-local' defaultValue={defaultValues.endDate} />
      </div>

      {/* Capacity / Price / Status */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-5'>
        <Field label='Capacity' name='capacity' type='number' defaultValue={String(defaultValues.capacity ?? '')} />
        <Field
          label='Price (paise) — 0 = free'
          name='pricePaise'
          type='number'
          defaultValue={String(defaultValues.pricePaise ?? 0)}
        />
        <div className='flex flex-col gap-1'>
          <label className='text-white/60 text-xs font-medium uppercase tracking-wider'>Status</label>
          <select
            name='status'
            defaultValue={defaultValues.status ?? 'DRAFT'}
            className='bg-white/5 border border-white/15 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-stride-yellow-accent/60'
          >
            <option value='DRAFT'>Draft</option>
            <option value='PUBLISHED'>Published</option>
            <option value='CANCELLED'>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Confirmation text */}
      <Field
        label='Registration Confirmation Text (Markdown — shown after booking)'
        name='confirmationText'
        as='textarea'
        defaultValue={defaultValues.confirmationText}
        rows={3}
      />

      {/* Banner images */}
      <div className='flex flex-col gap-2'>
        <div>
          <label className='text-white/60 text-xs font-medium uppercase tracking-wider'>
            Banner Images
          </label>
          <p className='text-white/30 text-xs mt-0.5'>Square or 3:4 portrait · Up to 5 · Used in event carousel</p>
        </div>
        <div className='grid grid-cols-3 sm:grid-cols-5 gap-3'>
          {bannerImages.map((url, i) => (
            <div key={url} className='relative aspect-square rounded-lg overflow-hidden border border-white/15 group'>
              <Image src={url} alt={`Banner ${i + 1}`} fill className='object-cover' sizes='160px' />
              <button
                type='button'
                onClick={() => removeBannerImage(i)}
                className='absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80'
                aria-label='Remove image'
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {bannerImages.length < 5 && (
            <button
              type='button'
              onClick={() => bannerFileRef.current?.click()}
              disabled={uploadingBanner}
              className='aspect-square rounded-lg border-2 border-dashed border-white/20 hover:border-stride-yellow-accent/50 text-white/40 hover:text-white/70 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50'
            >
              {uploadingBanner ? <Spinner /> : <Plus size={20} />}
              <span className='text-xs'>{uploadingBanner ? 'Uploading…' : 'Add'}</span>
            </button>
          )}
        </div>
        <input
          ref={bannerFileRef}
          type='file'
          accept='image/*'
          onChange={handleBannerAdd}
          className='hidden'
        />
      </div>

      {/* Cover image */}
      <div className='flex flex-col gap-2'>
        <label className='text-white/60 text-xs font-medium uppercase tracking-wider'>
          Cover Image
          <span className='text-white/30 normal-case tracking-normal font-normal ml-2'>(used for event card thumbnail)</span>
        </label>
        {coverPreview ? (
          <div className='relative w-full aspect-video rounded-lg overflow-hidden border border-white/15'>
            <Image src={coverPreview} alt='Cover preview' fill className='object-cover' sizes='600px' />
            <button
              type='button'
              onClick={() => {
                setCoverPreview('')
                if (hiddenCoverRef.current) hiddenCoverRef.current.value = ''
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className='absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors'
              aria-label='Remove cover image'
            >
              <X size={14} />
            </button>
            {uploadingCover && (
              <div className='absolute inset-0 flex items-center justify-center bg-black/50'>
                <span className='text-white text-sm font-medium'>Uploading…</span>
              </div>
            )}
          </div>
        ) : (
          <button
            type='button'
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingCover}
            className='flex flex-col items-center justify-center gap-2 w-full aspect-video rounded-lg border-2 border-dashed border-white/20 hover:border-stride-yellow-accent/50 text-white/40 hover:text-white/70 transition-colors disabled:opacity-50'
          >
            <Upload size={24} />
            <span className='text-sm'>{uploadingCover ? 'Uploading…' : 'Click to upload cover image'}</span>
            <span className='text-xs text-white/30'>JPG, PNG, WebP — max 8MB</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          onChange={handleCoverChange}
          className='hidden'
        />
      </div>

      <div className='flex gap-3 pt-2'>
        <SubmitButton label={submitLabel} />
        <a
          href='/admin/events'
          className='text-white/60 hover:text-white px-6 py-2.5 rounded-md border border-white/15 hover:border-white/30 transition-colors text-sm min-h-11 flex items-center'
        >
          Cancel
        </a>
      </div>
    </form>
  )
}

type FieldProps = {
  label: string
  name: string
  type?: string
  as?: 'input' | 'textarea'
  defaultValue?: string
  required?: boolean
  rows?: number
}

function Field({ label, name, type = 'text', as = 'input', defaultValue = '', required, rows }: FieldProps) {
  const base =
    'bg-white/5 border border-white/15 rounded-md px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-stride-yellow-accent/60 w-full'

  return (
    <div className='flex flex-col gap-1'>
      <label className='text-white/60 text-xs font-medium uppercase tracking-wider'>{label}</label>
      {as === 'textarea' ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          required={required}
          rows={rows ?? 3}
          className={base}
        />
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          required={required}
          className={base}
        />
      )}
    </div>
  )
}
