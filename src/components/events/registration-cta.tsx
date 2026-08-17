'use client'

import { useEffect, useState } from 'react'
import { RegisterButton } from './register-button'
import type { AdditionalField, EventPackage } from '@/types/event'

// Client island. The event page itself is ISR — identical for every visitor —
// and this is the only part that depends on who is looking.
//
// It used to be an async *server* component. Reading the session there made the
// whole `/events/[slug]` route dynamic, so every anonymous visitor, every
// Instagram click and every crawler paid for a full personalised rebuild
// (markdown re-parse included) of a page that differs between viewers only in
// this one box. Same trade the leaderboard already makes with
// `/api/leaderboard/me`.

/** Where this viewer stands with this event. */
export type ViewerState = 'none' | 'applied' | 'confirmed' | 'rejected'

type ViewerPayload = {
  isLoggedIn: boolean
  viewerState: ViewerState
  registrationId: string | null
  initial: {
    fullName: string | null
    dateOfBirth: string | null
    gender: string | null
    contactNumber: string | null
    emergencyContactNumber: string | null
  }
}

const ANONYMOUS: ViewerPayload = {
  isLoggedIn: false,
  viewerState: 'none',
  registrationId: null,
  initial: {
    fullName: null,
    dateOfBirth: null,
    gender: null,
    contactNumber: null,
    emergencyContactNumber: null,
  },
}

// One request per event id, shared by the desktop box and the mobile sticky
// bar — both mount together on every event page. Replaces the React cache()
// dedupe the server version relied on.
const inFlight = new Map<string, Promise<ViewerPayload>>()

function loadViewerState(eventId: string): Promise<ViewerPayload> {
  const existing = inFlight.get(eventId)
  if (existing) return existing

  const request = fetch(
    `/api/events/${encodeURIComponent(eventId)}/viewer-state`,
    { credentials: 'same-origin' },
  )
    .then(res => {
      if (!res.ok) throw new Error(`viewer-state responded ${res.status}`)
      return res.json() as Promise<ViewerPayload>
    })
    .catch((error: unknown) => {
      // Degrade to the signed-out panel rather than leaving a skeleton on
      // screen forever. A signed-in viewer sees the sign-in prompt, which still
      // leads somewhere useful, and the failure is not cached — dropping the
      // entry means the next mount retries instead of repeating a bad answer.
      console.error('Could not load registration state for this event:', error)
      inFlight.delete(eventId)
      return ANONYMOUS
    })

  inFlight.set(eventId, request)
  return request
}

function useViewerState(eventId: string): ViewerPayload | null {
  const [state, setState] = useState<ViewerPayload | null>(null)

  useEffect(() => {
    let active = true
    loadViewerState(eventId).then(payload => {
      if (active) setState(payload)
    })
    return () => { active = false }
  }, [eventId])

  return state
}

type SharedProps = {
  eventId: string
  eventSlug: string
  pricePaise: number
  isFull: boolean
  isPast: boolean
  additionalFields: AdditionalField[]
  termsAndConditions?: string | null
  /** Priced tiers. Empty unless packagesEnabled. */
  packages: EventPackage[]
  packagesEnabled: boolean
  packagesMultiSelect: boolean
  /**
   * Spots already taken per package id. Resolved on the server by the page —
   * it is the same for every viewer, so it stays a cached, tag-purged read
   * rather than another round trip from the browser.
   */
  packageSpotsTaken: Record<string, number>
  /** Opens one tier at a time — see resolveTierAvailability in @/types/event. */
  packagesProgressive: boolean
  razorpayKeyId?: string
  /** Registering is a free application Stride approves. */
  inviteOnly: boolean
}

type DesktopExtras = {
  priceLabel: string
  spotsLine: React.ReactNode
}

function statusText(opts: { viewerState: ViewerState; isPast: boolean; isFull: boolean; inviteOnly: boolean }) {
  if (opts.viewerState === 'confirmed') return "You're registered for this event."
  if (opts.viewerState === 'applied') return "Your application is in — we'll be in touch."
  // A rejected runner can still buy a ticket once the mode is off, so the copy
  // has to acknowledge the decision without closing the door.
  if (opts.viewerState === 'rejected') {
    return opts.inviteOnly
      ? "You weren't selected for this run."
      : "You weren't selected earlier — this run is now open to everyone."
  }
  if (opts.isPast) return 'This event has concluded.'
  if (opts.isFull) return 'This event is full.'
  if (opts.inviteOnly) return 'Apply below. Stride selects the athletes for this run.'
  return 'Secure your spot below.'
}

// Desktop box interior: status line + price row + button
export function RegistrationCtaDesktop(props: SharedProps & DesktopExtras) {
  const viewer = useViewerState(props.eventId)

  // RegisterButton decides whether to auto-open the modal (?register=1 on the
  // way back from sign-in) in a useState initialiser, so it must not mount
  // until the real viewer state is known — otherwise it would settle that
  // decision against a signed-out placeholder.
  if (!viewer) {
    return (
      <RegistrationCtaDesktopSkeleton
        isPast={props.isPast}
        isFull={props.isFull}
        priceLabel={props.priceLabel}
        spotsLine={props.spotsLine}
        inviteOnly={props.inviteOnly}
      />
    )
  }

  return (
    <>
      <div className='flex items-center justify-between gap-4 mb-4'>
        <div className='min-w-0'>
          <p className='text-white/60 text-sm'>
            {statusText({ viewerState: viewer.viewerState, isPast: props.isPast, isFull: props.isFull, inviteOnly: props.inviteOnly })}
          </p>
          {props.spotsLine}
        </div>
        <p className='text-2xl font-bold text-white shrink-0 font-mono'>{props.priceLabel}</p>
      </div>
      <RegisterButton
        eventId={props.eventId}
        eventSlug={props.eventSlug}
        pricePaise={props.pricePaise}
        isFull={props.isFull}
        viewerState={viewer.viewerState}
        registrationId={viewer.registrationId}
        isPast={props.isPast}
        isLoggedIn={viewer.isLoggedIn}
        initial={viewer.initial}
        additionalFields={props.additionalFields}
        termsAndConditions={props.termsAndConditions}
        packages={props.packages}
        packagesEnabled={props.packagesEnabled}
        packagesMultiSelect={props.packagesMultiSelect}
        packageSpotsTaken={props.packageSpotsTaken}
        packagesProgressive={props.packagesProgressive}
        razorpayKeyId={props.razorpayKeyId}
        inviteOnly={props.inviteOnly}
      />
    </>
  )
}

// Mobile sticky bar: just the button
export function RegistrationCtaMobile(props: SharedProps) {
  const viewer = useViewerState(props.eventId)

  if (!viewer) return <RegistrationCtaMobileSkeleton />

  return (
    <RegisterButton
      eventId={props.eventId}
      eventSlug={props.eventSlug}
      pricePaise={props.pricePaise}
      isFull={props.isFull}
      viewerState={viewer.viewerState}
      registrationId={viewer.registrationId}
      isPast={props.isPast}
      isLoggedIn={viewer.isLoggedIn}
      initial={viewer.initial}
      additionalFields={props.additionalFields}
      termsAndConditions={props.termsAndConditions}
      packages={props.packages}
      packagesEnabled={props.packagesEnabled}
      packagesMultiSelect={props.packagesMultiSelect}
      packageSpotsTaken={props.packageSpotsTaken}
        packagesProgressive={props.packagesProgressive}
      razorpayKeyId={props.razorpayKeyId}
      inviteOnly={props.inviteOnly}
    />
  )
}

// Loading states — same layout as the resolved ones (no CLS), with the
// anonymous status text (correct for most visitors) and a pulsing button.
// Also serve as the <Suspense> fallbacks the page renders into its static HTML.
export function RegistrationCtaDesktopSkeleton(props: {
  isPast: boolean
  isFull: boolean
  priceLabel: string
  spotsLine: React.ReactNode
  inviteOnly: boolean
}) {
  return (
    <>
      <div className='flex items-center justify-between gap-4 mb-4'>
        <div className='min-w-0'>
          <p className='text-white/60 text-sm'>
            {statusText({ viewerState: 'none', isPast: props.isPast, isFull: props.isFull, inviteOnly: props.inviteOnly })}
          </p>
          {props.spotsLine}
        </div>
        <p className='text-2xl font-bold text-white shrink-0 font-mono'>{props.priceLabel}</p>
      </div>
      <div className='w-full py-3.5 rounded-md bg-white/10 animate-pulse min-h-11' aria-hidden='true' />
    </>
  )
}

export function RegistrationCtaMobileSkeleton() {
  return <div className='w-full py-3.5 rounded-md bg-white/10 animate-pulse min-h-11' aria-hidden='true' />
}
