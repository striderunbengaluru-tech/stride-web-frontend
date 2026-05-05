'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Check, Globe, AtSign, Tag } from 'lucide-react'
import { WhatsAppIcon } from './partner-with-us-button'

type Props = {
  open: boolean
  onClose: () => void
}

type FormState = {
  brandName: string
  igHandle: string
  website: string
  commercial: boolean
}

export default function PartnerFormModal({ open, onClose }: Props) {
  const [form, setForm] = useState<FormState>({
    brandName: '',
    igHandle: '',
    website: '',
    commercial: false,
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
      `Open to commercial arrangement: ${form.commercial ? 'Yes' : 'No'}`,
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
    'w-full bg-white/6 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-stride-yellow-accent/50 focus:bg-white/10 transition-all duration-150'

  return (
    <div
      className='fixed inset-0 z-100 flex items-center justify-center px-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby='partner-modal-title'
    >
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/70 backdrop-blur-sm'
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Modal card */}
      <div
        ref={modalRef}
        className='relative w-full max-w-lg bg-stride-purple-primary border border-white/10 rounded-2xl shadow-2xl overflow-hidden'
      >
        {/* Yellow accent top stripe */}
        <div className='h-1 w-full bg-stride-yellow-accent' />

        {/* Close button — absolute at corner edge */}
        <button
          onClick={onClose}
          aria-label='Close'
          className='absolute top-4 right-4 z-10 text-white/30 hover:text-white transition-colors duration-150 cursor-pointer'
        >
          <X className='size-5' />
        </button>

        <div className='p-7 md:p-9'>
          {/* Centered header */}
          <div className='text-center mb-8'>
            <h2 id='partner-modal-title' className='text-xl font-bold text-white font-libre'>
              Partner With Us
            </h2>
            <p className='text-white/45 text-sm mt-1.5'>
              We&apos;ll reach out on WhatsApp within 24 hours.
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-5'>

            {/* Brand Name */}
            <div className='space-y-2'>
              <label htmlFor='brand-name' className='block text-left text-white/60 text-xs uppercase tracking-widest font-medium'>
                Brand Name <span className='text-stride-yellow-accent'>*</span>
              </label>
              <div className='relative'>
                <Tag size={15} className='absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none' />
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
            </div>

            {/* Instagram Handle */}
            <div className='space-y-2'>
              <label htmlFor='ig-handle' className='block text-left text-white/60 text-xs uppercase tracking-widest font-medium'>
                Instagram Handle <span className='text-stride-yellow-accent'>*</span>
              </label>
              <div className='relative'>
                <AtSign size={15} className='absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none' />
                <input
                  id='ig-handle'
                  type='text'
                  required
                  placeholder='yourbrand'
                  className={inputClass}
                  value={form.igHandle}
                  onChange={(e) => setForm((f) => ({ ...f, igHandle: e.target.value }))}
                />
              </div>
            </div>

            {/* Website */}
            <div className='space-y-2'>
              <label htmlFor='website' className='block text-left text-white/60 text-xs uppercase tracking-widest font-medium'>
                Website
              </label>
              <div className='relative'>
                <Globe size={15} className='absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none' />
                <input
                  id='website'
                  type='url'
                  placeholder='https://yourbrand.com'
                  className={inputClass}
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                />
              </div>
            </div>

            {/* Commercial arrangement — checkbox */}
            <div className='pt-1'>
              <label className='flex items-start gap-3.5 cursor-pointer group'>
                <div className='relative mt-0.5 shrink-0'>
                  <input
                    type='checkbox'
                    className='sr-only peer'
                    checked={form.commercial}
                    onChange={(e) => setForm((f) => ({ ...f, commercial: e.target.checked }))}
                  />
                  <div className='w-5 h-5 rounded-md border-2 border-white/20 bg-white/5 peer-checked:bg-stride-yellow-accent peer-checked:border-stride-yellow-accent transition-all duration-150 flex items-center justify-center group-hover:border-white/40'>
                    {form.commercial && <Check size={11} strokeWidth={3} className='text-copy-black' />}
                  </div>
                </div>
                <div>
                  <p className='text-white/80 text-sm font-medium leading-tight'>
                    Open to a commercial arrangement
                  </p>
                  <p className='text-white/35 text-xs mt-0.5'>
                    Paid partnerships, sponsored content, or event fees
                  </p>
                </div>
              </label>
            </div>

            {/* Divider */}
            <div className='border-t border-white/8 pt-1' />

            {/* Submit */}
            <button
              type='submit'
              className='w-full inline-flex items-center justify-center gap-2.5 bg-stride-yellow-accent text-copy-black font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 text-sm cursor-pointer'
            >
              <WhatsAppIcon size={17} />
              Send via WhatsApp
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
