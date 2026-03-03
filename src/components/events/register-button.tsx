'use client'

import { useState } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Cashfree: any
  }
}

type Props = {
  eventId: string
  pricePaise: number
  isFull: boolean
  isRegistered: boolean
  isLoggedIn: boolean
}

export function RegisterButton({ eventId, pricePaise, isFull, isRegistered, isLoggedIn }: Props) {
  const [loading, setLoading] = useState(false)

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
        className='block w-full py-3.5 rounded-md bg-stride-yellow-accent text-stride-dark font-semibold text-sm text-center min-h-11 hover:bg-stride-yellow-accent/90 transition-colors'
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
        return
      }

      // Free event registered
      if (data.registered) {
        window.location.reload()
        return
      }

      // Paid — open Cashfree checkout
      if (data.paymentSessionId) {
        const cashfree = await window.Cashfree({ mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? 'production' : 'sandbox' })
        cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_self' })
      }
    } finally {
      setLoading(false)
    }
  }

  const label = pricePaise === 0 ? 'RSVP Free' : `Register — ₹${pricePaise / 100}`

  return (
    <>
      {pricePaise > 0 && (
        // Load Cashfree JS SDK
        <script src='https://sdk.cashfree.com/js/v3/cashfree.js' async />
      )}
      <button
        onClick={handleRegister}
        disabled={loading}
        className='w-full py-3.5 rounded-md bg-stride-yellow-accent text-stride-dark font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors disabled:opacity-60 min-h-11'
      >
        {loading ? 'Processing…' : label}
      </button>
    </>
  )
}
