'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'
import type { EventFormData } from '@/lib/validations/admin'

type Props = {
  action: (formData: FormData) => Promise<void>
  defaultValues?: Partial<EventFormData & { eventDate?: string; endDate?: string }>
  submitLabel: string
}

export function EventForm({ action, defaultValues = {}, submitLabel }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [coverPreview, setCoverPreview] = useState<string>(defaultValues.coverUrl ?? '')
  const [uploading, setUploading] = useState(false)

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setCoverPreview(URL.createObjectURL(file))
    setUploading(true)
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
      setUploading(false)
    }
  }

  const hiddenCoverRef = useRef<HTMLInputElement>(null)

  return (
    <form action={action} className='space-y-5'>
      {/* Hidden field carries the uploaded URL */}
      <input ref={hiddenCoverRef} type='hidden' name='coverUrl' defaultValue={defaultValues.coverUrl ?? ''} />
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
        <Field label='Event Name *' name='name' defaultValue={defaultValues.name} required />
        <Field label='Subtitle' name='subtitle' defaultValue={defaultValues.subtitle} />
      </div>

      <Field
        label='Short Description'
        name='description'
        as='textarea'
        defaultValue={defaultValues.description}
        rows={2}
      />

      <Field
        label='Full Details (Markdown)'
        name='details'
        as='textarea'
        defaultValue={defaultValues.details}
        rows={6}
      />

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
        <Field label='Location' name='location' defaultValue={defaultValues.location} />
        <Field label='Google Maps URL' name='locationUrl' type='url' defaultValue={defaultValues.locationUrl} />
      </div>

      <Field label='Strava Route URL' name='stravaRouteUrl' type='url' defaultValue={defaultValues.stravaRouteUrl} />

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
        <Field label='Start Date & Time' name='eventDate' type='datetime-local' defaultValue={defaultValues.eventDate} />
        <Field label='End Date & Time' name='endDate' type='datetime-local' defaultValue={defaultValues.endDate} />
      </div>

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

      {/* Cover image upload */}
      <div className='flex flex-col gap-2'>
        <label className='text-white/60 text-xs font-medium uppercase tracking-wider'>Cover Image</label>
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
            {uploading && (
              <div className='absolute inset-0 flex items-center justify-center bg-black/50'>
                <span className='text-white text-sm font-medium'>Uploading…</span>
              </div>
            )}
          </div>
        ) : (
          <button
            type='button'
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className='flex flex-col items-center justify-center gap-2 w-full aspect-video rounded-lg border-2 border-dashed border-white/20 hover:border-stride-yellow-accent/50 text-white/40 hover:text-white/70 transition-colors disabled:opacity-50'
          >
            <Upload size={24} />
            <span className='text-sm'>{uploading ? 'Uploading…' : 'Click to upload cover image'}</span>
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
        <button
          type='submit'
          className='bg-stride-yellow-accent text-stride-dark font-semibold px-6 py-2.5 rounded-md hover:bg-stride-yellow-accent/90 transition-colors text-sm min-h-11'
        >
          {submitLabel}
        </button>
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
