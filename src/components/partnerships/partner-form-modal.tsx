'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { WhatsAppIcon } from './partner-with-us-button'
import { createClient } from '@/lib/supabase/client'

type Props = {
  open: boolean
  onClose: () => void
}

export default function PartnerFormModal({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState('')
  const [instagram, setInstagram] = useState('')
  const [website, setWebsite] = useState('')
  const [commercial, setCommercial] = useState<'yes' | 'no' | ''>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Log submission to Supabase — fire-and-forget so a failure never blocks WhatsApp redirect
    try {
      const supabase = createClient()
      await supabase.from('partnership_inquiries').insert({
        name,
        instagram,
        website,
        commercial: commercial || null,
      })
    } catch {
      // intentionally silent — logging is best-effort
    }

    const commercialText = commercial === 'yes' ? 'Yes' : commercial === 'no' ? 'No' : 'Not specified'
    const msg = encodeURIComponent(
      `Hi Stride Run Club! I'm interested in a brand partnership.\nName: ${name}\nInstagram: ${instagram}\nWebsite: ${website}\nCommercial arrangement: ${commercialText}`
    )
    window.open(`https://wa.me/918368877289?text=${msg}`, '_blank', 'noopener,noreferrer')
    setLoading(false)
    onClose()
  }

  if (!mounted) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 transition-opacity duration-200 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div className='absolute inset-0 bg-black/75' onClick={onClose} />

      {/* Panel */}
      <div className='relative z-10 w-full max-w-md' onClick={(e) => e.stopPropagation()}>
        <div className='relative bg-stride-purple-primary border border-white/15 rounded-2xl overflow-hidden shadow-2xl shadow-black/60'>

          {/* Top accent */}
          <div className='absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-stride-yellow-accent/70 to-transparent' />

          {/* Header — center aligned */}
          <div className='px-7 pt-7 pb-5 relative text-center'>
            <button
              onClick={onClose}
              aria-label='Close modal'
              className='absolute right-2 top-2 flex items-center justify-center w-8 h-8 rounded-full bg-white/8 border border-white/12 text-white/45 hover:text-white hover:bg-white/15 hover:border-white/25 transition-all duration-150 cursor-pointer'
            >
              <X size={15} />
            </button>
            <p className='text-stride-yellow-accent text-[10px] font-semibold uppercase tracking-[0.2em] mb-1.5'>
              Let&apos;s build together
            </p>
            <h2 className='text-white text-2xl font-bold font-libre leading-tight'>
              Partner With Stride
            </h2>
            <p className='text-white/45 text-sm mt-1'>
              We&apos;ll craft a custom package for your brand.
            </p>
          </div>

          {/* Divider */}
          <div className='mx-7 h-px bg-white/8' />

          {/* Form — labels left aligned */}
          <form onSubmit={handleSubmit} className='px-7 pt-5 pb-7 flex flex-col gap-4 text-left'>

            <div className='flex flex-col gap-1.5'>
              <label htmlFor='p-name' className='text-white/55 text-xs font-medium uppercase tracking-wide'>
                Your Name
              </label>
              <input
                id='p-name'
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Rohan Sharma'
                required
                className='bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-stride-yellow-accent/50 focus:bg-white/8 transition-all duration-150'
              />
            </div>

            <div className='flex flex-col gap-1.5'>
              <label htmlFor='p-instagram' className='text-white/55 text-xs font-medium uppercase tracking-wide'>
                Instagram Handle
              </label>
              <input
                id='p-instagram'
                type='text'
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder='@pumaindia'
                required
                className='bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-stride-yellow-accent/50 focus:bg-white/8 transition-all duration-150'
              />
            </div>

            <div className='flex flex-col gap-1.5'>
              <label htmlFor='p-website' className='text-white/55 text-xs font-medium uppercase tracking-wide'>
                Website Link
              </label>
              <input
                id='p-website'
                type='url'
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder='https://yourbrand.com'
                required
                className='bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-stride-yellow-accent/50 focus:bg-white/8 transition-all duration-150'
              />
            </div>

            <div className='flex flex-col gap-2'>
              <p className='text-white/55 text-xs font-medium uppercase tracking-wide'>
                Looking for a commercial arrangement?
              </p>
              <div className='flex gap-3'>
                {(['yes', 'no'] as const).map((val) => (
                  <button
                    key={val}
                    type='button'
                    onClick={() => setCommercial(val)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150 cursor-pointer ${
                      commercial === val
                        ? 'bg-stride-yellow-accent text-copy-black border-stride-yellow-accent'
                        : 'bg-white/5 text-white/60 border-white/10 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {val === 'yes' ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            <div className='pt-1 flex flex-col gap-3'>
              <button
                type='submit'
                disabled={loading}
                className='inline-flex items-center justify-center gap-2.5 bg-stride-yellow-accent text-copy-black font-bold px-6 py-3.5 rounded-md text-sm hover:scale-[1.02] hover:shadow-lg hover:shadow-stride-yellow-accent/30 active:scale-[0.97] transition-all duration-150 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100'
              >
                <WhatsAppIcon size={16} />
                {loading ? 'Connecting...' : 'Continue on WhatsApp'}
              </button>
              <p className='text-white/25 text-xs text-center'>
                We typically respond within a few hours
              </p>
            </div>

          </form>
        </div>
      </div>

    </div>,
    document.body
  )
}
