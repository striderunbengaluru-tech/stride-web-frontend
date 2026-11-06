'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { toast } from 'sonner'
import { formatRupees } from '@/lib/utils/money'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'

type Props = {
  open: boolean
  onClose: () => void
  registrationId: string
  amountDuePaise: number
  razorpayKeyId?: string
}

type PayResponse = {
  registrationId: string
  slug: string | null
  razorpayOrderId: string
  amount: number
  currency: string
  eventName: string | null
  userEmail: string | null
  error?: string
}

/**
 * "Ready to pay" confirmation for an approved invite-only runner. One sentence
 * of stakes, the amount, one button. Uses the window.Razorpay global declared
 * in participant-details-modal.tsx.
 */
export function PayApprovedModal({ open, onClose, registrationId, amountDuePaise, razorpayKeyId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  useBodyScrollLock(open)

  if (!open) return null

  const amount = formatRupees(amountDuePaise)

  function fail(message: string) {
    toast.error(message)
    setLoading(false)
  }

  async function pay() {
    setLoading(true)
    try {
      const res = await fetch('/api/events/pay-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      })
      const data = (await res.json()) as PayResponse
      if (!res.ok) return fail(data.error ?? 'Could not start payment. Please try again.')

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
              body: JSON.stringify({ ...response, registrationId }),
            })
            const verifyData = (await verifyRes.json()) as { success?: boolean; error?: string }
            if (verifyRes.ok && verifyData.success) {
              router.push(`/events/${data.slug}/confirmation/${registrationId}`)
            } else {
              fail(verifyData.error ?? 'Payment verification failed. Please contact support.')
            }
          } catch {
            fail('Verification error. Please contact support.')
          }
        },
        prefill: { email: data.userEmail ?? undefined },
        theme: { color: '#E1D03F' },
        modal: { ondismiss: () => setLoading(false) },
      })
      rzp.open()
    } catch {
      fail('Something went wrong. Please try again.')
    }
  }

  return createPortal(
    <>
      <Script src='https://checkout.razorpay.com/v1/checkout.js' strategy='lazyOnload' />
      <div
        className='fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-stride-purple-primary/80 backdrop-blur-xl px-4 pb-6 sm:pb-0'
        onClick={() => !loading && onClose()}
      >
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby='pay-approved-title'
          className='w-full max-w-sm bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-6'
          onClick={e => e.stopPropagation()}
        >
          <h2 id='pay-approved-title' className='text-white text-xl font-bold'>Ready to pay?</h2>
          <p className='text-white/70 text-sm mt-2 leading-relaxed'>
            You&apos;re selected. Your spot is confirmed only after payment.
          </p>
          <p className='text-white text-3xl font-bold font-mono mt-5'>{amount}</p>
          <button
            type='button'
            onClick={pay}
            disabled={loading}
            className='mt-6 w-full py-3.5 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm min-h-11 hover:bg-stride-yellow-accent/90 transition-colors disabled:opacity-60'
          >
            {loading ? 'Opening payment…' : `Proceed to pay ${amount}`}
          </button>
          <button
            type='button'
            onClick={onClose}
            disabled={loading}
            className='mt-2 w-full py-3 rounded-md text-white/60 text-sm min-h-11 hover:text-white transition-colors'
          >
            Not now
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
