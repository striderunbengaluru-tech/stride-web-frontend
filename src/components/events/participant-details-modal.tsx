'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

// Razorpay checkout global — loaded via CDN Script below
declare global {
  interface Window {
    // justification: third-party Razorpay checkout SDK loaded from CDN
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'

const GENDER_OPTIONS: { value: Gender; label: string; icon: string }[] = [
  { value: 'MALE',              label: 'Male',           icon: '♂' },
  { value: 'FEMALE',            label: 'Female',         icon: '♀' },
  { value: 'OTHER',             label: 'Other',          icon: '⚧' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not say', icon: '✕' },
]

const inputBase =
  'bg-white/8 border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/70 focus:bg-white/10 transition-colors w-full'

type Props = {
  open: boolean
  onClose: () => void
  eventId: string
  pricePaise: number
  initial: {
    fullName: string | null
    dateOfBirth: string | null
    gender: string | null
    contactNumber: string | null
    emergencyContactNumber: string | null
  }
  razorpayKeyId?: string
}

export function ParticipantDetailsModal({ open, onClose, eventId, pricePaise, initial, razorpayKeyId }: Props) {
  const router = useRouter()

  const [fullName, setFullName] = useState(initial.fullName ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(initial.dateOfBirth ?? '')
  const [gender, setGender] = useState<Gender | ''>(
    (initial.gender as Gender) ?? ''
  )
  const [contactNumber, setContactNumber] = useState(initial.contactNumber ?? '')
  const [emergencyContactNumber, setEmergencyContactNumber] = useState(initial.emergencyContactNumber ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isPaid = pricePaise > 0

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null)
      setLoading(false)
    }
  }, [open])

  // Esc key to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onClose])

  // Portal target — guard against SSR where document is undefined
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!open || !mounted) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (fullName.trim().length < 2) return setError('Please enter your full name')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return setError('Please enter your date of birth')
    if (!gender) return setError('Please select your gender')
    if (contactNumber.trim().length < 7) return setError('Please enter a valid contact number')
    if (emergencyContactNumber.trim().length < 7) return setError('Please enter a valid emergency contact number')

    setLoading(true)
    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          fullName: fullName.trim(),
          dateOfBirth,
          gender,
          contactNumber: contactNumber.trim(),
          emergencyContactNumber: emergencyContactNumber.trim(),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Registration failed')
        setLoading(false)
        return
      }

      // Free event — already confirmed
      if (!data.razorpayOrderId) {
        router.push(`/events/${data.slug}/confirmation/${data.registrationId}`)
        return
      }

      // Paid event — open Razorpay
      const rzp = new window.Razorpay({
        key: razorpayKeyId ?? '',
        amount: data.amount,
        currency: data.currency,
        name: 'Stride Run Club',
        description: data.eventName ?? 'Event Registration',
        order_id: data.razorpayOrderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          setLoading(true)
          try {
            const verifyRes = await fetch('/api/events/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                registrationId: data.registrationId,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.success) {
              router.push(`/events/${data.slug}/confirmation/${data.registrationId}`)
            } else {
              setError(verifyData.error ?? 'Payment verification failed. Please contact support.')
              setLoading(false)
            }
          } catch {
            setError('Verification error. Please contact support.')
            setLoading(false)
          }
        },
        prefill: { name: fullName.trim(), email: data.userEmail, contact: contactNumber.trim() },
        theme: { color: '#E1D03F' },
        modal: {
          ondismiss: () => setLoading(false),
        },
      })
      rzp.open()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return createPortal(
    <>
      {isPaid && (
        <Script src='https://checkout.razorpay.com/v1/checkout.js' strategy='lazyOnload' />
      )}
      <div
        className='fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-stride-purple-primary/40 backdrop-blur-xl px-4 pt-24 sm:pt-6 pb-6'
        onClick={() => !loading && onClose()}
      >
        <div
          onClick={e => e.stopPropagation()}
          className='relative w-full max-w-md max-h-[calc(100dvh-7rem)] sm:max-h-[calc(100dvh-3rem)]'
        >
          {/* Ambient glow behind the card */}
          <div className='pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full bg-stride-yellow-accent/20 blur-[80px]' aria-hidden='true' />
          <div className='pointer-events-none absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-stride-yellow-accent/10 blur-[70px]' aria-hidden='true' />

          {/* Yellow corner accents (echoes become-a-member design) */}
          <div className='pointer-events-none absolute -top-px -left-px w-14 h-14 border-t-2 border-l-2 border-stride-yellow-accent/50 rounded-tl-2xl z-10' aria-hidden='true' />
          <div className='pointer-events-none absolute -bottom-px -right-px w-14 h-14 border-b-2 border-r-2 border-stride-yellow-accent/50 rounded-br-2xl z-10' aria-hidden='true' />

          {/* Glass shell */}
          <div className='relative bg-stride-purple-primary/80 backdrop-blur-2xl border border-white/15 rounded-2xl overflow-hidden max-h-[calc(100dvh-7rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col'>

            {/* Header */}
            <div className='shrink-0 px-6 pt-6 pb-4 border-b border-white/8'>
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <span className='inline-flex items-center gap-2 text-stride-yellow-accent text-[10px] font-bold tracking-[0.2em] uppercase mb-2.5'>
                    <span className='w-1.5 h-1.5 rounded-full bg-stride-yellow-accent animate-pulse' />
                    Final step
                  </span>
                  <h2 className='text-white font-bold text-xl leading-tight'>Tell us about you</h2>
                  <p className='text-white/50 text-sm mt-1 leading-snug'>Quick details before we lace up — saved for next time.</p>
                </div>
                <button
                  type='button'
                  onClick={onClose}
                  disabled={loading}
                  className='shrink-0 w-8 h-8 -mr-1 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors flex items-center justify-center disabled:opacity-40'
                  aria-label='Close'
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable form area */}
            <form onSubmit={handleSubmit} className='overflow-y-auto px-6 py-5 space-y-4 flex-1'>

            {/* Full name */}
            <div>
              <label className='block text-white/70 text-xs font-medium mb-1.5'>Full name *</label>
              <input
                type='text'
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder='Your full name'
                className={inputBase}
                required
              />
            </div>

            {/* Date of birth */}
            <div>
              <label className='block text-white/70 text-xs font-medium mb-1.5'>Date of birth *</label>
              <input
                type='date'
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={`${inputBase} scheme-dark`}
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label className='block text-white/70 text-xs font-medium mb-1.5'>Gender *</label>
              <div className='grid grid-cols-4 gap-1.5'>
                {GENDER_OPTIONS.map(opt => {
                  const active = gender === opt.value
                  return (
                    <button
                      key={opt.value}
                      type='button'
                      onClick={() => setGender(opt.value)}
                      aria-pressed={active}
                      className={`relative flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl text-[11px] font-medium leading-tight text-center transition-all duration-200 border ${
                        active
                          ? 'bg-stride-yellow-accent/15 border-stride-yellow-accent text-stride-yellow-accent shadow-[0_0_0_3px_rgba(225,208,63,0.08)]'
                          : 'bg-white/5 border-white/15 text-white/55 hover:bg-white/10 hover:border-white/25 hover:text-white/85'
                      }`}
                    >
                      <span className='text-base'>{opt.icon}</span>
                      <span className='line-clamp-2'>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Contact number */}
            <div>
              <label className='block text-white/70 text-xs font-medium mb-1.5'>Contact number *</label>
              <input
                type='tel'
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
                placeholder='98765 43210'
                inputMode='tel'
                className={inputBase}
                required
              />
            </div>

            {/* Emergency contact number */}
            <div>
              <label className='block text-white/70 text-xs font-medium mb-1.5'>Emergency contact number *</label>
              <input
                type='tel'
                value={emergencyContactNumber}
                onChange={e => setEmergencyContactNumber(e.target.value)}
                placeholder='98765 43210'
                inputMode='tel'
                className={inputBase}
                required
              />
              <p className='text-white/30 text-[11px] mt-1.5'>Someone we can reach if anything happens during the run.</p>
            </div>

            {/* Error */}
            {error && (
              <div className='bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-red-400 text-xs'>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type='submit'
              disabled={loading}
              className='w-full py-3 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors disabled:opacity-60 min-h-11 flex items-center justify-center gap-2'
            >
              {loading
                ? <><Spinner /> Processing…</>
                : isPaid
                  ? `Continue to payment · ₹${(pricePaise / 100).toLocaleString('en-IN')}`
                  : 'Confirm registration'}
            </button>

            <p className='text-white/30 text-[11px] text-center'>
              Your details are saved to your Stride profile — you won&apos;t need to fill this in again.
            </p>
            </form>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
