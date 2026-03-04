'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/spinner'

type Props = {
  eventId: string
  pricePaise: number
  isFull: boolean
  isRegistered: boolean
  isLoggedIn: boolean
}

export function RegisterButton({ eventId, pricePaise, isFull, isRegistered, isLoggedIn }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
        return
      }

      if (data.registrationId && data.slug) {
        router.push(`/events/${data.slug}/confirmation/${data.registrationId}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const label = pricePaise === 0 ? 'RSVP Free' : `Register — ₹${pricePaise / 100}`

  return (
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
  )
}
