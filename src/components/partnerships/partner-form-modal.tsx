'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

type FormState = {
  brandName: string
  igHandle: string
  website: string
  commercial: 'yes' | 'no' | ''
}

export default function PartnerFormModal({ open, onClose }: Props) {
  const [form, setForm] = useState<FormState>({
    brandName: '',
    igHandle: '',
    website: '',
    commercial: '',
  })
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const lines = [
      `Hi Stride! 👋`,
      ``,
      `Brand: ${form.brandName}`,
      `Instagram: @${form.igHandle.replace(/^@/, '')}`,
      form.website ? `Website: ${form.website}` : null,
      `Open to commercial arrangement: ${form.commercial === 'yes' ? 'Yes' : 'No'}`,
      ``,
      `I'd love to explore a brand partnership with Stride Run Club.`,
    ]
      .filter((l) => l !== null)
      .join('\n')

    const waUrl = `https://wa.me/919560602019?text=${encodeURIComponent(lines)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
    onClose()
  }

  const inputClass =
    'w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-copy-white placeholder-copy-white/30 text-sm focus:outline-none focus:border-stride-yellow-accent/60 transition-colors duration-150'
  const labelClass = 'block text-copy-white/70 text-xs uppercase tracking-wide font-medium mb-1.5'

  return (
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center px-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby='partner-modal-title'
    >
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Modal card */}
      <div
        ref={modalRef}
        className='relative w-full max-w-md bg-stride-purple-primary/95 backdrop-blur-xl border border-white/15 rounded-2xl p-6 md:p-8 shadow-2xl'
      >
        {/* Header */}
        <div className='flex items-start justify-between mb-6'>
          <div>
            <h2 id='partner-modal-title' className='text-lg font-bold text-copy-white'>
              Partner With Us
            </h2>
            <p className='text-copy-white/50 text-sm mt-1'>
              We&apos;ll reach out on WhatsApp within 24 hours.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label='Close'
            className='text-copy-white/40 hover:text-copy-white transition-colors duration-150 ml-4'
          >
            <X className='size-5' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label htmlFor='brand-name' className={labelClass}>
              Brand Name *
            </label>
            <input
              id='brand-name'
              type='text'
              required
              placeholder='e.g. PUMA India'
              className={inputClass}
              value={form.brandName}
              onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor='ig-handle' className={labelClass}>
              Instagram Handle *
            </label>
            <div className='relative'>
              <span className='absolute left-4 top-1/2 -translate-y-1/2 text-copy-white/40 text-sm'>
                @
              </span>
              <input
                id='ig-handle'
                type='text'
                required
                placeholder='yourbrand'
                className={`${inputClass} pl-8`}
                value={form.igHandle}
                onChange={(e) => setForm((f) => ({ ...f, igHandle: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label htmlFor='website' className={labelClass}>
              Website
            </label>
            <input
              id='website'
              type='url'
              placeholder='https://yourbrand.com'
              className={inputClass}
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            />
          </div>

          <div>
            <p className={labelClass}>Open to a commercial arrangement? *</p>
            <div className='flex gap-3'>
              {(['yes', 'no'] as const).map((val) => (
                <label
                  key={val}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer text-sm font-medium transition-all duration-150 ${
                    form.commercial === val
                      ? 'border-stride-yellow-accent bg-stride-yellow-accent/10 text-stride-yellow-accent'
                      : 'border-white/15 text-copy-white/60 hover:border-white/30 hover:text-copy-white'
                  }`}
                >
                  <input
                    type='radio'
                    name='commercial'
                    value={val}
                    required
                    className='sr-only'
                    checked={form.commercial === val}
                    onChange={() => setForm((f) => ({ ...f, commercial: val }))}
                  />
                  {val === 'yes' ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
          </div>

          <button
            type='submit'
            className='w-full bg-stride-yellow-accent text-copy-black font-bold py-3.5 rounded-md hover:opacity-90 transition-opacity mt-2'
          >
            Send via WhatsApp
          </button>
        </form>
      </div>
    </div>
  )
}
