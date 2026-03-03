'use client'

import type { EventFormData } from '@/lib/validations/admin'

type Props = {
  action: (formData: FormData) => Promise<void>
  defaultValues?: Partial<EventFormData & { eventDate?: string; endDate?: string }>
  submitLabel: string
}

export function EventForm({ action, defaultValues = {}, submitLabel }: Props) {
  return (
    <form action={action} className='space-y-5'>
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

      <Field label='Cover Image URL' name='coverUrl' defaultValue={defaultValues.coverUrl} />

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
