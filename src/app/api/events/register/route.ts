import { NextResponse, after } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { eventRegsTag } from '@/lib/data/events'
import { nanoid } from 'nanoid'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { registerEventSchema } from '@/lib/validations/events'
import { sendConfirmationEmailOnce } from '@/lib/email/send-hooks'
import { isChoiceFieldType, type AdditionalField } from '@/types/event'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = registerEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please fill all required fields' }, { status: 400 })
  }

  const { eventId, fullName, dateOfBirth, gender, contactNumber, emergencyContactNumber, acceptedTerms, customResponses } = parsed.data

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
    .select('id, name, slug, status, price_paise, capacity, additional_fields, event_date, terms_and_conditions')
    .eq('id', eventId)
    .single()

  if (!event || event.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
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

  const { data: existing } = await adminClient
    .from('event_registrations')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.status === 'CONFIRMED') {
    return NextResponse.json({ error: 'Already registered' }, { status: 409 })
  }

  // A leftover PENDING (abandoned Razorpay checkout) or CANCELLED row would trip
  // the unique(event_id, user_id) constraint and keep holding a reserved seat.
  // Clear it so the user can retry — only a CONFIRMED registration blocks.
  if (existing) {
    const { error: delError } = await adminClient
      .from('event_registrations')
      .delete()
      .eq('id', existing.id)
      .neq('status', 'CONFIRMED')
    if (delError) {
      console.error('[Register] Failed to clear prior registration', delError)
      return NextResponse.json({ error: 'Could not complete your registration. Please try again.' }, { status: 500 })
    }
  }

  if (event.capacity) {
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

  // Free event — confirm immediately. The seat cap is enforced atomically
  // inside register_for_event (SELECT ... FOR UPDATE on the event row) so two
  // concurrent last-seat registrations cannot both insert a CONFIRMED row.
  if (event.price_paise === 0) {
    const { data: outcome, error: rpcError } = await adminClient.rpc('register_for_event', {
      p_registration_id: registrationId,
      p_event_id: eventId,
      p_user_id: user.id,
      p_status: 'CONFIRMED',
      p_custom_responses: customResponsesJson,
    })
    if (rpcError) {
      console.error('[Register] Registration failed', rpcError)
      return NextResponse.json({ error: 'Could not complete your registration. Please try again.' }, { status: 500 })
    }
    if (outcome === 'CAPACITY_FULL') {
      return NextResponse.json({ error: 'Event is full' }, { status: 409 })
    }
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
  })
  if (rpcError) {
    console.error('[Register] Registration failed', rpcError)
    return NextResponse.json({ error: 'Could not complete your registration. Please try again.' }, { status: 500 })
  }
  if (outcome === 'CAPACITY_FULL') {
    return NextResponse.json({ error: 'Event is full' }, { status: 409 })
  }
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
      amount: event.price_paise,
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
    amount: event.price_paise,
    currency: 'INR',
    eventName: event.name,
    userName: fullName,
    userEmail: user.email,
  })
}
