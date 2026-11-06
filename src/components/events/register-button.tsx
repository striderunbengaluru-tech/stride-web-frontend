'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ParticipantDetailsModal } from '@/components/events/participant-details-modal'
import { PayApprovedModal } from '@/components/events/pay-approved-modal'
import { formatRupees } from '@/lib/utils/money'
import type { ViewerState } from '@/components/events/registration-cta'
import type { AdditionalField, EventPackage } from '@/types/event'

/**
 * Query params that open a popup on arrival:
 * `register=1` — back from sign-in, open the registration form.
 * `pay=1`      — from the "You're selected" payment email, open Razorpay.
 */
const REGISTER_PARAM = 'register'
const PAY_PARAM = 'pay'

/**
 * Opens a popup on arrival, from whichever copy of this button is on screen.
 *
 * The event page mounts RegisterButton twice (desktop box and mobile bar, one
 * hidden by CSS) and both popups portal to <body>, so opening from both would
 * stack two popups. The hidden copy's button has no client rects, so it stays
 * shut. Checked on the next frame, after layout, so the check sees final CSS.
 * The param is then dropped so a refresh doesn't reopen the popup.
 */
function useOpenOnArrival(
  enabled: boolean,
  button: React.RefObject<HTMLButtonElement | null>,
  param: string,
  open: () => void,
) {
  useEffect(() => {
    if (!enabled) return
    const frame = requestAnimationFrame(() => {
      if (!button.current || button.current.getClientRects().length === 0) return
      open()
      const url = new URL(window.location.href)
      url.searchParams.delete(param)
      window.history.replaceState(window.history.state, '', url)
    })
    return () => cancelAnimationFrame(frame)
  }, [enabled, button, param, open])
}

type Props = {
  eventId: string
  eventSlug: string
  pricePaise: number
  isFull: boolean
  /** Where the viewer stands: not registered, applied, confirmed or rejected. */
  viewerState: ViewerState
  /** Registering is a free application Stride approves. */
  inviteOnly?: boolean
  /** The viewer's CONFIRMED or APPLIED registration id — links to their receipt. */
  registrationId?: string | null
  /** Locked at approval. Set only when viewerState is 'awaiting_payment'. */
  amountDuePaise?: number | null
  isPast: boolean
  isLoggedIn: boolean
  initial: {
    fullName: string | null
    dateOfBirth: string | null
    gender: string | null
    contactNumber: string | null
    emergencyContactNumber: string | null
    marketingOptIn: boolean
  }
  additionalFields?: AdditionalField[]
  termsAndConditions?: string | null
  packages?: EventPackage[]
  packagesEnabled?: boolean
  packagesMultiSelect?: boolean
  /** Spots already taken per package id — drives "N left" / sold-out in the modal. */
  packageSpotsTaken?: Record<string, number>
  /** Opens one tier at a time — see resolveTierAvailability in @/types/event. */
  packagesProgressive?: boolean
  razorpayKeyId?: string
}

export function RegisterButton({
  eventId,
  eventSlug,
  pricePaise,
  isFull,
  viewerState,
  inviteOnly = false,
  registrationId,
  amountDuePaise,
  isPast,
  isLoggedIn,
  initial,
  additionalFields,
  termsAndConditions,
  packages,
  packagesEnabled,
  packagesMultiSelect,
  packageSpotsTaken,
  packagesProgressive,
  razorpayKeyId,
}: Props) {
  // The params are read here client-side so the server page never touches
  // searchParams. Never auto-open for past events.
  const searchParams = useSearchParams()
  const wantsRegister = searchParams.get(REGISTER_PARAM) === '1'
  const wantsPay = searchParams.get(PAY_PARAM) === '1'
  // A rejected runner on a now-open event is free to register, so only the
  // three "already in the system" states suppress the registration auto-open.
  const settled = viewerState === 'confirmed' || viewerState === 'applied' || viewerState === 'awaiting_payment'
  const [modalOpen, setModalOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const registerButton = useRef<HTMLButtonElement>(null)
  const payButton = useRef<HTMLButtonElement>(null)

  useOpenOnArrival(
    wantsRegister && isLoggedIn && !settled && !isFull && !isPast,
    registerButton,
    REGISTER_PARAM,
    useCallback(() => setModalOpen(true), []),
  )
  useOpenOnArrival(
    wantsPay && viewerState === 'awaiting_payment' && !isPast,
    payButton,
    PAY_PARAM,
    useCallback(() => setPayOpen(true), []),
  )

  if (viewerState === 'confirmed') {
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

  // Applied and waiting. Not a dead end — the application page restates what
  // happens next, which is the only thing they can act on right now.
  if (viewerState === 'applied') {
    return registrationId ? (
      <a
        href={`/events/${eventSlug}/confirmation/${registrationId}`}
        className='block w-full py-3.5 rounded-md bg-white/10 border border-stride-yellow-accent/30 text-stride-yellow-accent font-bold text-sm text-center min-h-11 hover:bg-white/15 transition-colors'
      >
        View my application
      </a>
    ) : (
      <button
        disabled
        className='w-full py-3.5 rounded-md bg-white/10 text-white/50 font-semibold text-sm cursor-not-allowed min-h-11'
      >
        Application submitted
      </button>
    )
  }

  // A not-selected applicant never reaches this component while the run is
  // invite-only: registration-cta shows them the notice instead. Once
  // invite-only is switched off they get the ordinary register flow below.

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

  if (viewerState === 'awaiting_payment' && registrationId && amountDuePaise) {
    return (
      <>
        <button
          ref={payButton}
          type='button'
          onClick={() => setPayOpen(true)}
          className='relative w-full py-3.5 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors min-h-11 overflow-hidden cta-shimmer'
        >
          <span className='relative z-10'>Pay {formatRupees(amountDuePaise)} to reserve my spot</span>
        </button>
        <PayApprovedModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          registrationId={registrationId}
          amountDuePaise={amountDuePaise}
          razorpayKeyId={razorpayKeyId}
        />
      </>
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
    // A selected runner arriving from the payment email signed out keeps the
    // pay intent through sign-in, so the popup still opens when they're back.
    const next = `/events/${eventSlug}?${wantsPay ? PAY_PARAM : REGISTER_PARAM}=1`
    const href = `/become-a-member?next=${encodeURIComponent(next)}`
    return (
      <a
        href={href}
        className='block w-full py-3.5 rounded-md bg-stride-yellow-accent text-copy-black font-semibold text-sm text-center min-h-11 hover:bg-stride-yellow-accent/90 transition-colors'
      >
        {inviteOnly ? 'Join the Waitlist' : 'Join the experience'}
      </a>
    )
  }

  return (
    <>
      <button
        ref={registerButton}
        type='button'
        onClick={() => setModalOpen(true)}
        className='relative w-full py-3.5 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors min-h-11 overflow-hidden cta-shimmer'
      >
        <span className='relative z-10'>{inviteOnly ? 'Join the Waitlist' : 'Join here'}</span>
      </button>

      <ParticipantDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        eventId={eventId}
        eventSlug={eventSlug}
        pricePaise={pricePaise}
        initial={initial}
        additionalFields={additionalFields}
        termsAndConditions={termsAndConditions}
        packages={packages}
        packagesEnabled={packagesEnabled}
        packagesMultiSelect={packagesMultiSelect}
        packageSpotsTaken={packageSpotsTaken}
        packagesProgressive={packagesProgressive}
        razorpayKeyId={razorpayKeyId}
        inviteOnly={inviteOnly}
      />
    </>
  )
}
