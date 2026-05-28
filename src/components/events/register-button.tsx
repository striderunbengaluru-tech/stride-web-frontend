'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { Spinner } from '@/components/ui/spinner'

// Razorpay checkout global — loaded via CDN Script below
declare global {
  interface Window {
    // justification: third-party Razorpay checkout SDK loaded from CDN
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

type Props = {
  eventId: string
  pricePaise: number
  isFull: boolean
  isRegistered: boolean
  isLoggedIn: boolean
  razorpayKeyId?: string
}

export function RegisterButton({
  eventId,
  pricePaise,
  isFull,
  isRegistered,
  isLoggedIn,
  razorpayKeyId,
}: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const isPaid = pricePaise > 0

  if (isRegistered) {
    return (
      <button
        disabled
        className='w-full py-3.5 rounded-md bg-white/10 text-white/50 font-semibold text-sm cursor-not-allowed min-h-11'
      >
        You&apos;re registered ✓
      </button>
    )
  }

  if (isFull) {
    return (
      <button
        disabled
        className='w-full py-3.5 rounded-md bg-white/10 text-white/40 font-semibold text-sm cursor-not-allowed min-h-11'
      >
        Event Full
      </button>
    )
  }

  if (!isLoggedIn) {
    return (
      <a
        href='/login'
        className='block w-full py-3.5 rounded-md bg-stride-yellow-accent text-copy-black font-semibold text-sm text-center min-h-11 hover:bg-stride-yellow-accent/90 transition-colors'
      >
        Sign in to Register
      </a>
    )
  }

  async function handleRegister() {
    setLoading(true)
    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error ?? 'Registration failed')
        setLoading(false)
        return
      }

      // Free event — already confirmed
      if (!data.razorpayOrderId) {
        router.push(`/events/${data.slug}/confirmation/${data.registrationId}`)
        return
      }

      // Paid event — open Razorpay checkout
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
              alert(verifyData.error ?? 'Payment verification failed. Please contact support.')
              setLoading(false)
            }
          } catch {
            alert('Verification error. Please contact support.')
            setLoading(false)
          }
        },
        prefill: { name: data.userName, email: data.userEmail },
        theme: { color: '#E1D03F' },
        modal: {
          ondismiss: () => setLoading(false),
        },
      })
      rzp.open()
    } catch {
      alert('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const label = pricePaise === 0
    ? 'RSVP Free'
    : `Register — ₹${(pricePaise / 100).toLocaleString('en-IN')}`

  return (
    <>
      {isPaid && (
        <Script
          src='https://checkout.razorpay.com/v1/checkout.js'
          strategy='lazyOnload'
        />
      )}
      <button
        onClick={handleRegister}
        disabled={loading}
        className='w-full py-3.5 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors disabled:opacity-60 min-h-11'
      >
        {loading ? (
          <span className='flex items-center justify-center gap-2'>
            <Spinner /> Processing…
          </span>
        ) : label}
      </button>
    </>
  )
}
