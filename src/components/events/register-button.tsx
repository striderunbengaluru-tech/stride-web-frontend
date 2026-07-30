'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ParticipantDetailsModal } from '@/components/events/participant-details-modal'
import type { AdditionalField, EventPackage } from '@/types/event'

type Props = {
  eventId: string
  eventSlug: string
  pricePaise: number
  isFull: boolean
  isRegistered: boolean
  /** The viewer's CONFIRMED registration id — links to their ticket. */
  registrationId?: string | null
  isPast: boolean
  isLoggedIn: boolean
  initial: {
    fullName: string | null
    dateOfBirth: string | null
    gender: string | null
    contactNumber: string | null
    emergencyContactNumber: string | null
  }
  additionalFields?: AdditionalField[]
  termsAndConditions?: string | null
  packages?: EventPackage[]
  packagesEnabled?: boolean
  packagesMultiSelect?: boolean
  razorpayKeyId?: string
}

export function RegisterButton({
  eventId,
  eventSlug,
  pricePaise,
  isFull,
  isRegistered,
  registrationId,
  isPast,
  isLoggedIn,
  initial,
  additionalFields,
  termsAndConditions,
  packages,
  packagesEnabled,
  packagesMultiSelect,
  razorpayKeyId,
}: Props) {
  // ?register=1 (returning from login) is read here client-side so the server
  // page never touches searchParams — never auto-open for past events
  const searchParams = useSearchParams()
  const autoOpen = searchParams.get('register') === '1'
  const [modalOpen, setModalOpen] = useState(Boolean(autoOpen && isLoggedIn && !isRegistered && !isFull && !isPast))

  if (isRegistered) {
    // Plain <a>, not <Link>: the confirmation page is `force-dynamic` and
    // per-user, so prefetching it on hover would cost a wasted server render.
    // Without an id there's nothing to link to — fall back to the flat state.
    return registrationId ? (
      <a
        href={`/events/${eventSlug}/confirmation/${registrationId}`}
        className='block w-full py-3.5 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm text-center min-h-11 hover:bg-stride-yellow-accent/90 transition-colors'
      >
        View my ticket
      </a>
    ) : (
      <button
        disabled
        className='w-full py-3.5 rounded-md bg-white/10 text-white/50 font-semibold text-sm cursor-not-allowed min-h-11'
      >
        You&apos;re registered ✓
      </button>
    )
  }

  if (isPast) {
    return (
      <button
        disabled
        aria-disabled='true'
        className='w-full py-3.5 rounded-md bg-white/8 text-white/35 font-semibold text-sm cursor-not-allowed min-h-11 border border-white/10'
      >
        Event Concluded
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

  return (
    <>
      <button
        type='button'
        onClick={() => setModalOpen(true)}
        className='relative w-full py-3.5 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors min-h-11 overflow-hidden cta-shimmer'
      >
        <span className='relative z-10'>Join the run</span>
      </button>

      <ParticipantDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        eventId={eventId}
        pricePaise={pricePaise}
        initial={initial}
        additionalFields={additionalFields}
        termsAndConditions={termsAndConditions}
        packages={packages}
        packagesEnabled={packagesEnabled}
        packagesMultiSelect={packagesMultiSelect}
        razorpayKeyId={razorpayKeyId}
      />
    </>
  )
}
