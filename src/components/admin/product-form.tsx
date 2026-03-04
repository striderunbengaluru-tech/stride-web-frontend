'use client'

import { useFormStatus } from 'react-dom'
import type { ProductFormData } from '@/lib/validations/admin'
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
  defaultValues?: Partial<ProductFormData>
  submitLabel: string
}

export function ProductForm({ action, defaultValues = {}, submitLabel }: Props) {
  return (
    <form action={action} className='space-y-5'>
      <Field label='Product Name *' name='name' defaultValue={defaultValues.name} required />

      <Field
        label='Description'
        name='description'
        as='textarea'
        defaultValue={defaultValues.description}
        rows={3}
      />

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-5'>
        <Field
          label='Price (paise) *'
          name='pricePaise'
          type='number'
          defaultValue={String(defaultValues.pricePaise ?? '')}
          required
        />
        <Field
          label='Stock'
          name='stock'
          type='number'
          defaultValue={String(defaultValues.stock ?? 0)}
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
            <option value='ARCHIVED'>Archived</option>
          </select>
        </div>
      </div>

      <Field label='Image URL' name='imageUrl' defaultValue={defaultValues.imageUrl} />

      <div className='flex gap-3 pt-2'>
        <SubmitButton label={submitLabel} />
        <a
          href='/admin/products'
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
