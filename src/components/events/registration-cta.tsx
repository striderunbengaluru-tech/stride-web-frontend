import { cache as reactCache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { RegisterButton } from './register-button'
import type { AdditionalField } from '@/types/event'

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

const getViewerState = reactCache(async (eventId: string) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { isLoggedIn: false, isRegistered: false, registrationId: null, initial: EMPTY_INITIAL }
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

  const isRegistered = reg?.status === 'CONFIRMED'
  // Only surfaced for a CONFIRMED row — that's the only state the confirmation
  // page will render (it re-checks session, ownership and status itself).
  return {
    isLoggedIn: true,
    isRegistered,
    registrationId: isRegistered ? reg.id : null,
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
  razorpayKeyId?: string
}

type DesktopExtras = {
  priceLabel: string
  spotsLine: React.ReactNode
}

function statusText(opts: { isRegistered: boolean; isPast: boolean; isFull: boolean }) {
  if (opts.isRegistered) return "You're registered for this event."
  if (opts.isPast) return 'This event has concluded.'
  if (opts.isFull) return 'This event is full.'
  return 'Secure your spot below.'
}

// Desktop box interior: status line + price row + button
export async function RegistrationCtaDesktop(props: SharedProps & DesktopExtras) {
  const { isLoggedIn, isRegistered, registrationId, initial } = await getViewerState(props.eventId)
  return (
    <>
      <div className='flex items-center justify-between gap-4 mb-4'>
        <div className='min-w-0'>
          <p className='text-white/60 text-sm'>
            {statusText({ isRegistered, isPast: props.isPast, isFull: props.isFull })}
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
        isRegistered={isRegistered}
        registrationId={registrationId}
        isPast={props.isPast}
        isLoggedIn={isLoggedIn}
        initial={initial}
        additionalFields={props.additionalFields}
        termsAndConditions={props.termsAndConditions}
        razorpayKeyId={props.razorpayKeyId}
      />
    </>
  )
}

// Mobile sticky bar: just the button
export async function RegistrationCtaMobile(props: SharedProps) {
  const { isLoggedIn, isRegistered, registrationId, initial } = await getViewerState(props.eventId)
  return (
    <RegisterButton
      eventId={props.eventId}
      eventSlug={props.eventSlug}
      pricePaise={props.pricePaise}
      isFull={props.isFull}
      isRegistered={isRegistered}
      registrationId={registrationId}
      isPast={props.isPast}
      isLoggedIn={isLoggedIn}
      initial={initial}
      additionalFields={props.additionalFields}
      termsAndConditions={props.termsAndConditions}
      razorpayKeyId={props.razorpayKeyId}
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
}) {
  return (
    <>
      <div className='flex items-center justify-between gap-4 mb-4'>
        <div className='min-w-0'>
          <p className='text-white/60 text-sm'>
            {statusText({ isRegistered: false, isPast: props.isPast, isFull: props.isFull })}
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
