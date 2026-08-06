import { cache as reactCache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { getPackageSpotsTaken } from '@/lib/data/events'
import { RegisterButton } from './register-button'
import type { AdditionalField, EventPackage } from '@/types/event'

// Async server component streamed in via <Suspense>. The event page's shell
// (hero, details, price) renders instantly from cached data; only this
// viewer-dependent island waits on auth + the viewer's registration state.
// React cache() dedupes the fetch between the desktop and mobile placements.

const EMPTY_INITIAL = {
  fullName: null as string | null,
  dateOfBirth: null as string | null,
  gender: null as string | null,
  contactNumber: null as string | null,
  emergencyContactNumber: null as string | null,
}

/** Where this viewer stands with this event. */
export type ViewerState = 'none' | 'applied' | 'confirmed' | 'rejected'

const getViewerState = reactCache(async (eventId: string) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { isLoggedIn: false, viewerState: 'none' as ViewerState, registrationId: null, initial: EMPTY_INITIAL }
  }

  const [{ data: reg }, { data: profile }] = await Promise.all([
    adminClient
      .from('event_registrations')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle(),
    adminClient
      .from('users')
      .select('full_name, date_of_birth, gender, contact_number, emergency_contact_number')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  // Fall back to Google OAuth metadata if users.full_name is empty
  const oauthName = (user.user_metadata?.full_name as string | undefined)
    ?? (user.user_metadata?.name as string | undefined)
    ?? null
  const initial = profile
    ? {
        fullName: profile.full_name ?? oauthName,
        dateOfBirth: profile.date_of_birth ?? null,
        gender: profile.gender ?? null,
        contactNumber: profile.contact_number ?? null,
        emergencyContactNumber: profile.emergency_contact_number ?? null,
      }
    : { ...EMPTY_INITIAL, fullName: oauthName }

  // Four viewer states rather than a boolean: an invite-only applicant is
  // neither "registered" nor free to register again, and a rejected runner may
  // still buy a ticket once the mode is switched off.
  const status = reg?.status ?? null
  const viewerState: ViewerState =
    status === 'CONFIRMED' ? 'confirmed'
    : status === 'APPLIED' ? 'applied'
    : status === 'REJECTED' ? 'rejected'
    : 'none'

  // Surfaced for CONFIRMED and APPLIED — the two states the confirmation page
  // renders (it re-checks session, ownership and status itself). A REJECTED
  // runner is sent to the event page instead, where they can register if the
  // event is now open.
  const hasReceipt = viewerState === 'confirmed' || viewerState === 'applied'

  return {
    isLoggedIn: true,
    viewerState,
    registrationId: hasReceipt ? reg!.id : null,
    initial,
  }
})

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

// Per-package spot counts, read only when the event actually has packages.
// getPackageSpotsTaken is a cached read tagged with the event's registration tag,
// so the desktop and mobile CTAs share one fetch and every registration purges it.
async function packageSpots(props: SharedProps): Promise<Record<string, number>> {
  if (!props.packagesEnabled || props.packages.length === 0) return {}
  return getPackageSpotsTaken(props.eventId)
}

// Desktop box interior: status line + price row + button
export async function RegistrationCtaDesktop(props: SharedProps & DesktopExtras) {
  const [{ isLoggedIn, viewerState, registrationId, initial }, packageSpotsTaken] = await Promise.all([
    getViewerState(props.eventId),
    packageSpots(props),
  ])
  return (
    <>
      <div className='flex items-center justify-between gap-4 mb-4'>
        <div className='min-w-0'>
          <p className='text-white/60 text-sm'>
            {statusText({ viewerState, isPast: props.isPast, isFull: props.isFull, inviteOnly: props.inviteOnly })}
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
        viewerState={viewerState}
        registrationId={registrationId}
        isPast={props.isPast}
        isLoggedIn={isLoggedIn}
        initial={initial}
        additionalFields={props.additionalFields}
        termsAndConditions={props.termsAndConditions}
        packages={props.packages}
        packagesEnabled={props.packagesEnabled}
        packagesMultiSelect={props.packagesMultiSelect}
        packageSpotsTaken={packageSpotsTaken}
        razorpayKeyId={props.razorpayKeyId}
        inviteOnly={props.inviteOnly}
      />
    </>
  )
}

// Mobile sticky bar: just the button
export async function RegistrationCtaMobile(props: SharedProps) {
  const [{ isLoggedIn, viewerState, registrationId, initial }, packageSpotsTaken] = await Promise.all([
    getViewerState(props.eventId),
    packageSpots(props),
  ])
  return (
    <RegisterButton
      eventId={props.eventId}
      eventSlug={props.eventSlug}
      pricePaise={props.pricePaise}
      isFull={props.isFull}
      viewerState={viewerState}
      registrationId={registrationId}
      isPast={props.isPast}
      isLoggedIn={isLoggedIn}
      initial={initial}
      additionalFields={props.additionalFields}
      termsAndConditions={props.termsAndConditions}
      packages={props.packages}
      packagesEnabled={props.packagesEnabled}
      packagesMultiSelect={props.packagesMultiSelect}
      packageSpotsTaken={packageSpotsTaken}
      razorpayKeyId={props.razorpayKeyId}
      inviteOnly={props.inviteOnly}
    />
  )
}

// Suspense fallbacks — same layout as the resolved states (no CLS), with the
// anonymous status text (correct for most visitors) and a pulsing button.
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
