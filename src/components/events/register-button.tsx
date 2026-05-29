'use client'

import { useState } from 'react'
import { ParticipantDetailsModal } from '@/components/events/participant-details-modal'

type Props = {
  eventId: string
  eventSlug: string
  pricePaise: number
  isFull: boolean
  isRegistered: boolean
  isLoggedIn: boolean
  autoOpen?: boolean
  initial: {
    fullName: string | null
    dateOfBirth: string | null
    gender: string | null
    contactNumber: string | null
    emergencyContactNumber: string | null
  }
  razorpayKeyId?: string
}

export function RegisterButton({
  eventId,
  eventSlug,
  pricePaise,
  isFull,
  isRegistered,
  isLoggedIn,
  autoOpen,
  initial,
  razorpayKeyId,
}: Props) {
  // Modal mounts open if returning from login with ?register=1
  const [modalOpen, setModalOpen] = useState(Boolean(autoOpen && isLoggedIn && !isRegistered && !isFull))

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
    const next = `/events/${eventSlug}?register=1`
    const href = `/become-a-member?next=${encodeURIComponent(next)}`
    return (
      <a
        href={href}
        className='block w-full py-3.5 rounded-md bg-stride-yellow-accent text-copy-black font-semibold text-sm text-center min-h-11 hover:bg-stride-yellow-accent/90 transition-colors'
      >
        Become a Member to Register
      </a>
    )
  }

  const label = pricePaise === 0
    ? 'RSVP Free'
    : `Register — ₹${(pricePaise / 100).toLocaleString('en-IN')}`

  return (
    <>
      <button
        type='button'
        onClick={() => setModalOpen(true)}
        className='w-full py-3.5 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors min-h-11'
      >
        {label}
      </button>

      <ParticipantDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        eventId={eventId}
        pricePaise={pricePaise}
        initial={initial}
        razorpayKeyId={razorpayKeyId}
      />
    </>
  )
}
