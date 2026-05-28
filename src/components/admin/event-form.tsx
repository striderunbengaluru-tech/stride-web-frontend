'use client'

import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Upload, X, Plus, Eye, ChevronDown } from 'lucide-react'
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
  const [location, setLocation] = useState(defaultValues.location ?? '')
  const [pricePaise, setPricePaise] = useState(defaultValues.pricePaise ?? 0)
  const [eventDate, setEventDate] = useState(defaultValues.eventDate ?? '')

  // Banner images
  const bannerFileRef = useRef<HTMLInputElement>(null)
  const [bannerImages, setBannerImages] = useState<string[]>(() => {
    try { return JSON.parse(defaultValues.bannerImages ?? '[]') as string[] }
    catch { return [] }
  })
  const [uploadingBanner, setUploadingBanner] = useState(false)

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
        setBannerImages(prev => [...prev, data.url as string])
      } else {
        alert((data as { error?: string }).error ?? 'Upload failed')
      }
    } finally {
      setUploadingBanner(false)
      if (bannerFileRef.current) bannerFileRef.current.value = ''
    }
  }

  async function removeBannerImage(index: number) {
    const url = bannerImages[index]
    setBannerImages(prev => prev.filter((_, i) => i !== index))

    // Delete from Supabase storage if it's an uploaded file
    if (url && url.startsWith(STORAGE_BASE)) {
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
    <div className='grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start'>

      {/* ── Left: Form ── */}
      <form action={action} className='space-y-5'>

        {/* Error from duplicate slug */}
        {errorMessage && (
          <div className='bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm'>
            {errorMessage}
          </div>
        )}

        {/* Hidden field for controlled details */}
        <input type='hidden' name='details' value={details} />
        <input type='hidden' name='bannerImages' value={JSON.stringify(bannerImages)} readOnly />

        {/* Name + Subtitle */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <Field
            label='Event name *'
            name='name'
            value={name}
            onChange={setName}
            required
          />
          <Field
            label='Subtitle'
            name='subtitle'
            value={subtitle}
            onChange={setSubtitle}
          />
        </div>

        {/* Full details — markdown editor */}
        <div className='flex flex-col gap-1.5'>
          <label className='text-white/70 text-sm font-medium'>Full details</label>
          <div data-color-mode='dark' className='rounded-lg overflow-hidden border border-white/20'>
            <MDEditor
              value={details}
              onChange={(v) => setDetails(v ?? '')}
              height={280}
              preview='edit'
              className='bg-transparent!'
            />
          </div>
          <p className='text-white/30 text-xs'>Markdown supported — headings, bold, lists, links</p>
        </div>

        {/* Location + Meeting point */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <Field
            label='Location name'
            name='location'
            value={location}
            onChange={setLocation}
          />
          <Field
            label='Meeting point — Google Maps URL'
            name='locationUrl'
            type='url'
            defaultValue={defaultValues.locationUrl}
          />
        </div>

        {/* Post-run gather point */}
        <Field
          label='Post-run gather point — Google Maps URL'
          name='postRunLocationUrl'
          type='url'
          defaultValue={defaultValues.postRunLocationUrl}
        />

        {/* Run route */}
        <Field
          label='Run route URL (Strava / Komoot / etc.)'
          name='stravaRouteUrl'
          type='url'
          defaultValue={defaultValues.stravaRouteUrl}
        />

        {/* Dates */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <Field
            label='Start date & time'
            name='eventDate'
            type='datetime-local'
            value={eventDate}
            onChange={setEventDate}
          />
          <Field
            label='End date & time'
            name='endDate'
            type='datetime-local'
            defaultValue={defaultValues.endDate}
          />
        </div>

        {/* Capacity / Price / Status */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          <Field
            label='Capacity'
            name='capacity'
            type='number'
            defaultValue={String(defaultValues.capacity ?? '')}
          />
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

        {/* Confirmation text */}
        <Field
          label='Registration confirmation text (Markdown — shown after booking)'
          name='confirmationText'
          as='textarea'
          defaultValue={defaultValues.confirmationText}
          rows={3}
        />

        {/* Banner images */}
        <div className='flex flex-col gap-2'>
          <div>
            <label className='text-white/70 text-sm font-medium'>Banner images</label>
            <p className='text-white/30 text-xs mt-0.5'>Square or 3:4 portrait · Up to 5 · Converted to WebP automatically</p>
          </div>
          <div className='grid grid-cols-3 sm:grid-cols-5 gap-3'>
            {bannerImages.map((url, i) => (
              <div key={url} className='relative aspect-square rounded-xl overflow-hidden border border-white/15 group'>
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
                className='aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-stride-yellow-accent/50 text-white/40 hover:text-white/60 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50'
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

        {/* Actions */}
        <div className='flex flex-wrap items-center gap-3 pt-2'>
          <SubmitButton label={submitLabel} />
          <a
            href='/admin/events'
            className='text-white/60 hover:text-white px-5 py-3 rounded-md border border-white/15 hover:border-white/30 transition-colors text-sm min-h-11 flex items-center'
          >
            Cancel
          </a>
          {/* Mobile-only preview button */}
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

      {/* ── Right: Live Preview (desktop only) ── */}
      <div className='hidden lg:block sticky top-6'>
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
