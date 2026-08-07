import { NextResponse, after } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { eventRegsTag } from '@/lib/data/events'
import { nanoid } from 'nanoid'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { registerEventSchema } from '@/lib/validations/events'
import { sendConfirmationEmailOnce } from '@/lib/email/send-hooks'
import { CLEARABLE_REGISTRATION_STATUSES } from '@/lib/events/invite-only'
import {
  isChoiceFieldType, sumPackageAmountPaise,
  type AdditionalField, type EventPackage, type SelectedPackage,
} from '@/types/event'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = registerEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please fill all required fields' }, { status: 400 })
  }

  const { eventId, fullName, dateOfBirth, gender, contactNumber, emergencyContactNumber, acceptedTerms, customResponses, selectedPackageIds } = parsed.data

  // Persist participant details on the user row — idempotent (re-running with
  // the same values is a no-op). full_name overwrites any previous value so
  // the user can correct typos at any time.
  const { error: profileError } = await adminClient
    .from('users')
    .update({
      full_name: fullName,
      date_of_birth: dateOfBirth,
      gender,
      contact_number: contactNumber,
      emergency_contact_number: emergencyContactNumber,
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('[Register] Failed to save participant details', profileError)
    return NextResponse.json({ error: 'Could not save your details. Please try again.' }, { status: 500 })
  }

  const { data: event } = await adminClient
    .from('events')
    .select('id, name, slug, status, price_paise, capacity, additional_fields, event_date, terms_and_conditions, invite_only, registrations_closed, packages, packages_enabled, packages_multi_select')
    .eq('id', eventId)
    .single()

  if (!event || event.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Invite-only: this registration is a free application an admin has to
  // approve. Price and packages are ignored for the duration — see the branch
  // below and the matching guard inside register_for_event, which reads the
  // flag under the event-row lock and is the authoritative one.
  const inviteOnly = event.invite_only === true

  // An admin has closed sign-ups. Checked before everything else — a closed
  // event accepts no ticket and no application — and repeated inside
  // register_for_event under the event-row lock, which is the authoritative
  // one. The message is deliberately identical to the capacity path: to a
  // runner a paused run and a sold-out run are the same thing.
  if (event.registrations_closed === true) {
    return NextResponse.json({ error: 'Event is full' }, { status: 409 })
  }

  // If the event has terms, acceptance is mandatory — defense in depth (UI also gates this).
  if (event.terms_and_conditions && event.terms_and_conditions.trim().length > 0 && acceptedTerms !== true) {
    return NextResponse.json({ error: 'You must accept the terms & conditions' }, { status: 400 })
  }

  // Block registration for past events — defense in depth (UI also disables the button).
  if (event.event_date && new Date(event.event_date).getTime() < Date.now()) {
    return NextResponse.json({ error: 'This event has concluded.' }, { status: 409 })
  }

  // Validate dynamic custom fields against the event's schema.
  let eventFields: AdditionalField[] = []
  try { eventFields = JSON.parse(event.additional_fields ?? '[]') as AdditionalField[] }
  catch { eventFields = [] }

  const filteredResponses: Record<string, string | number> = {}
  for (const field of eventFields) {
    const raw = customResponses[field.id]
    const isEmpty = raw === undefined || raw === null || String(raw).trim() === ''

    if (field.required && isEmpty) {
      return NextResponse.json({ error: `"${field.label}" is required`, fieldId: field.id }, { status: 400 })
    }
    if (isEmpty) continue

    if (field.type === 'number') {
      const num = Number(raw)
      if (Number.isNaN(num)) {
        return NextResponse.json({ error: `"${field.label}" must be a number`, fieldId: field.id }, { status: 400 })
      }
      filteredResponses[field.id] = num
      continue
    }
    if (field.type === 'link') {
      const str = String(raw).trim()
      try { new URL(str) }
      catch {
        return NextResponse.json({ error: `"${field.label}" must be a valid URL (start with http:// or https://)`, fieldId: field.id }, { status: 400 })
      }
      filteredResponses[field.id] = str
      continue
    }
    if (isChoiceFieldType(field.type)) {
      // Only the admin's own options may be stored — a hand-rolled request must
      // not be able to write arbitrary text into a choice answer.
      const str = String(raw).trim()
      if (!(field.options ?? []).includes(str)) {
        return NextResponse.json({ error: `"${field.label}" must be one of the listed options`, fieldId: field.id }, { status: 400 })
      }
      filteredResponses[field.id] = str
      continue
    }
    filteredResponses[field.id] = String(raw).trim()
  }
  const customResponsesJson = JSON.stringify(filteredResponses)

  // ── Resolve what this registration costs ───────────────────────────────────
  // The client sends package IDS. Every amount is read back from the event's own
  // package list, so a hand-rolled request cannot name its own price. Same
  // whitelist idiom as the choice fields above.
  // Invite-only applications are free, whatever the event's price says. Any
  // selectedPackageIds that arrive are ignored rather than rejected: a runner
  // whose page was cached from before the toggle flipped should not hit an
  // error. The DB discards them too, so this is belt and braces.
  let chargeTotalPaise = inviteOnly ? 0 : event.price_paise
  let selectedPackagesJson: string | null = null
  // Populated alongside the price resolution so a PACKAGE_FULL outcome can be
  // reported using the name the runner actually saw, not an opaque id.
  let packageNameById = new Map<string, string>()

  if (event.packages_enabled && !inviteOnly) {
    let defined: EventPackage[] = []
    try { defined = JSON.parse(event.packages ?? '[]') as EventPackage[] }
    catch { defined = [] }

    if (defined.length === 0) {
      // packages_enabled with nothing to pick — the admin action prevents this,
      // so a row in this state is corrupt rather than merely misconfigured.
      console.error('[Register] packages_enabled but no valid packages', { eventId })
      return NextResponse.json({ error: 'Registration is unavailable for this event.' }, { status: 409 })
    }

    const ids = [...new Set(selectedPackageIds)]
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Please choose a package' }, { status: 400 })
    }
    if (!event.packages_multi_select && ids.length > 1) {
      return NextResponse.json({ error: 'Only one package can be selected for this event' }, { status: 400 })
    }

    const chosen: SelectedPackage[] = []
    for (const id of ids) {
      const match = defined.find(pkg => pkg.id === id)
      if (!match) {
        return NextResponse.json({ error: 'That package is no longer available' }, { status: 400 })
      }
      chosen.push({ id: match.id, name: match.name, amountPaise: match.amountPaise })
    }

    chargeTotalPaise = sumPackageAmountPaise(chosen)
    selectedPackagesJson = JSON.stringify(chosen)
    packageNameById = new Map(defined.map(pkg => [pkg.id, pkg.name]))
  }

  const { data: existing } = await adminClient
    .from('event_registrations')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.status === 'CONFIRMED') {
    return NextResponse.json({ error: 'Already registered' }, { status: 409 })
  }

  // One application per invite-only window. An applicant awaiting a decision
  // must not be able to re-submit, and a runner who wasn't selected must not be
  // able to re-apply — but once the mode is switched off they CAN buy a ticket
  // like anyone else, which is why REJECTED is only blocking while it's on.
  if (existing?.status === 'APPLIED') {
    return NextResponse.json({ error: "Your application is already in — we'll be in touch." }, { status: 409 })
  }
  if (existing?.status === 'REJECTED' && inviteOnly) {
    return NextResponse.json({ error: 'Applications for this event are closed for your account.' }, { status: 409 })
  }

  // A leftover PENDING (abandoned Razorpay checkout), CANCELLED (failed
  // payment) or REJECTED (not selected, event now open to all) row would trip
  // the unique(event_id, user_id) constraint. Clear it so the runner can start
  // again. A positive allowlist rather than `.neq('CONFIRMED')`: when a sixth
  // status appears later, this no-ops instead of destroying the row.
  if (existing) {
    const { data: cleared, error: delError } = await adminClient
      .from('event_registrations')
      .delete()
      .eq('id', existing.id)
      .in('status', CLEARABLE_REGISTRATION_STATUSES)
      .select('id')
    if (delError) {
      console.error('[Register] Failed to clear prior registration', delError)
      return NextResponse.json({ error: 'Could not complete your registration. Please try again.' }, { status: 500 })
    }
    // Matched nothing: a concurrent request re-inserted, or the row moved to a
    // status we must not clear. Previously the insert below then violated the
    // unique constraint and surfaced as a 500.
    if (!cleared?.length) {
      return NextResponse.json({ error: 'You already have a registration for this event.' }, { status: 409 })
    }
  }

  // Applications are unlimited — capacity gates approvals, not applying.
  if (event.capacity && !inviteOnly) {
    const { count: confirmedCount } = await adminClient
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'CONFIRMED')

    if ((confirmedCount ?? 0) >= event.capacity) {
      return NextResponse.json({ error: 'Event is full' }, { status: 409 })
    }
  }

  const registrationId = nanoid()

  // register_for_event returns 'PACKAGE_FULL:<id>' when that package's own spot
  // budget is exhausted, checked under the same event-row lock as total
  // capacity. Nothing was inserted, so there is no hold to release. `field` lets
  // the modal scroll the package list back into view.
  const PACKAGE_FULL_PREFIX = 'PACKAGE_FULL:'
  function packageFullResponse(outcome: string) {
    const name = packageNameById.get(outcome.slice(PACKAGE_FULL_PREFIX.length))
    return NextResponse.json({
      error: name
        ? `"${name}" is sold out — please pick another package.`
        : 'That package is sold out — please pick another.',
      field: 'packages',
    }, { status: 409 })
  }

  // The toggle can flip between the cached event read above and the RPC's
  // locked read, so BOTH branches below have to tolerate an 'APPLIED' outcome.
  const appliedResponse = () => {
    revalidateTag(eventRegsTag(eventId), 'max')
    revalidatePath(`/events/${event.slug}`)
    return NextResponse.json({ registrationId, slug: event.slug, applied: true })
  }
  const alreadyRegisteredResponse = () =>
    NextResponse.json({ error: 'You already have a registration for this event.' }, { status: 409 })
  // The admin closed the event between our read above and the RPC's locked
  // read. Nothing was inserted, so there is no hold to release.
  const registrationsClosedResponse = () =>
    NextResponse.json({ error: 'Event is full' }, { status: 409 })

  // ── Invite-only: record a free application and stop ────────────────────────
  // No Razorpay, no confirmation email. The runner hears nothing until an admin
  // approves them, which is what sends the "You're selected" mail.
  if (inviteOnly) {
    const { data: outcome, error: rpcError } = await adminClient.rpc('register_for_event', {
      p_registration_id: registrationId,
      p_event_id: eventId,
      p_user_id: user.id,
      p_status: 'APPLIED',
      p_custom_responses: customResponsesJson,
      p_selected_packages: null,
      p_amount_due_paise: 0,
    })
    if (rpcError) {
      console.error('[Register] Application failed', rpcError)
      return NextResponse.json({ error: 'Could not submit your application. Please try again.' }, { status: 500 })
    }
    if (outcome === 'REGISTRATIONS_CLOSED') return registrationsClosedResponse()
    if (outcome === 'ALREADY_REGISTERED') return alreadyRegisteredResponse()
    if (outcome !== 'APPLIED') {
      console.error('[Register] Unexpected application outcome', outcome)
      return NextResponse.json({ error: 'Could not submit your application. Please try again.' }, { status: 500 })
    }
    return appliedResponse()
  }

  // Nothing to charge — confirm immediately. Keyed off the resolved total, not
  // event.price_paise, so a ₹0 package (or an all-free selection) skips Razorpay
  // exactly like a free event does. The seat cap is enforced atomically inside
  // register_for_event (SELECT ... FOR UPDATE on the event row) so two
  // concurrent last-seat registrations cannot both insert a CONFIRMED row.
  if (chargeTotalPaise === 0) {
    const { data: outcome, error: rpcError } = await adminClient.rpc('register_for_event', {
      p_registration_id: registrationId,
      p_event_id: eventId,
      p_user_id: user.id,
      p_status: 'CONFIRMED',
      p_custom_responses: customResponsesJson,
      p_selected_packages: selectedPackagesJson,
      p_amount_due_paise: chargeTotalPaise,
    })
    if (rpcError) {
      console.error('[Register] Registration failed', rpcError)
      return NextResponse.json({ error: 'Could not complete your registration. Please try again.' }, { status: 500 })
    }
    if (outcome === 'CAPACITY_FULL') {
      return NextResponse.json({ error: 'Event is full' }, { status: 409 })
    }
    if (outcome === 'REGISTRATIONS_CLOSED') return registrationsClosedResponse()
    if (typeof outcome === 'string' && outcome.startsWith(PACKAGE_FULL_PREFIX)) {
      return packageFullResponse(outcome)
    }
    // The event became invite-only between our read and the RPC's lock.
    if (outcome === 'APPLIED') return appliedResponse()
    if (outcome === 'ALREADY_REGISTERED') return alreadyRegisteredResponse()
    if (outcome !== 'INSERTED') {
      console.error('[Register] Unexpected registration outcome', outcome)
      return NextResponse.json({ error: 'Could not complete your registration. Please try again.' }, { status: 500 })
    }
    // Bust the event page's server cache so back-navigation shows
    // "You're registered ✓" instead of a stale Register CTA, and purge the
    // cached confirmed-count so spots-left is exact after every registration.
    revalidateTag(eventRegsTag(eventId), 'max')
    revalidatePath(`/events/${event.slug}`)
    after(() => sendConfirmationEmailOnce(registrationId))
    return NextResponse.json({ registrationId, slug: event.slug })
  }

  // Paid event — reserve the seat as PENDING FIRST through the atomic capacity
  // guard (an in-checkout PENDING hold reserves a seat for 15 min), THEN create
  // the Razorpay order and attach it. Reserving before charging means we never
  // create an order for a seat that's already gone.
  const { data: outcome, error: rpcError } = await adminClient.rpc('register_for_event', {
    p_registration_id: registrationId,
    p_event_id: eventId,
    p_user_id: user.id,
    p_status: 'PENDING',
    p_custom_responses: customResponsesJson,
    p_selected_packages: selectedPackagesJson,
    // Persisted so verify-payment and the webhook can compare the captured
    // amount against this registration's own total. It can't be re-derived from
    // events.price_paise once packages are in play.
    p_amount_due_paise: chargeTotalPaise,
  })
  if (rpcError) {
    console.error('[Register] Registration failed', rpcError)
    return NextResponse.json({ error: 'Could not complete your registration. Please try again.' }, { status: 500 })
  }
  if (outcome === 'CAPACITY_FULL') {
    return NextResponse.json({ error: 'Event is full' }, { status: 409 })
  }
  if (outcome === 'REGISTRATIONS_CLOSED') return registrationsClosedResponse()
  if (typeof outcome === 'string' && outcome.startsWith(PACKAGE_FULL_PREFIX)) {
    return packageFullResponse(outcome)
  }
  // The event became invite-only between our read and the RPC's lock: the row
  // was recorded as a free application, so there is nothing to charge.
  if (outcome === 'APPLIED') return appliedResponse()
  if (outcome === 'ALREADY_REGISTERED') return alreadyRegisteredResponse()
  if (outcome !== 'INSERTED') {
    console.error('[Register] Unexpected registration outcome', outcome)
    return NextResponse.json({ error: 'Could not complete your registration. Please try again.' }, { status: 500 })
  }

  const razorpay = new Razorpay({
    key_id: process.env.STRIDE_RAZORPAY_KEY_ID ?? '',
    key_secret: process.env.STRIDE_RAZORPAY_KEY_SECRET ?? '',
  })

  let order
  try {
    order = await razorpay.orders.create({
      amount: chargeTotalPaise,
      currency: 'INR',
      receipt: registrationId,
    })
  } catch (err) {
    console.error('[Register] Razorpay order creation failed', err)
    // Release the seat we just reserved so the abandoned hold doesn't linger.
    await adminClient.from('event_registrations').delete().eq('id', registrationId)
    return NextResponse.json({ error: 'Payment initialisation failed' }, { status: 500 })
  }

  const { error: orderLinkError } = await adminClient
    .from('event_registrations')
    .update({ razorpay_order_id: order.id })
    .eq('id', registrationId)
  if (orderLinkError) {
    console.error('[Register] Failed to attach Razorpay order id', orderLinkError)
    await adminClient.from('event_registrations').delete().eq('id', registrationId)
    return NextResponse.json({ error: 'Payment initialisation failed' }, { status: 500 })
  }

  return NextResponse.json({
    registrationId,
    slug: event.slug,
    razorpayOrderId: order.id,
    amount: chargeTotalPaise,
    currency: 'INR',
    eventName: event.name,
    userName: fullName,
    userEmail: user.email,
  })
}
