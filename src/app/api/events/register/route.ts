import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { registerEventSchema } from '@/lib/validations/events'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = registerEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please fill all required fields' }, { status: 400 })
  }

  const { eventId, fullName, dateOfBirth, gender, contactNumber, emergencyContactNumber } = parsed.data

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
    .select('id, name, slug, status, price_paise, capacity')
    .eq('id', eventId)
    .single()

  if (!event || event.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const { data: existing } = await adminClient
    .from('event_registrations')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already registered' }, { status: 409 })
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

  // Free event — confirm immediately
  if (event.price_paise === 0) {
    await adminClient.from('event_registrations').insert({
      id: registrationId,
      event_id: eventId,
      user_id: user.id,
      status: 'CONFIRMED',
    })
    return NextResponse.json({ registrationId, slug: event.slug })
  }

  // Paid event — create Razorpay order, hold seat as PENDING
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
    return NextResponse.json({ error: 'Payment initialisation failed' }, { status: 500 })
  }

  await adminClient.from('event_registrations').insert({
    id: registrationId,
    event_id: eventId,
    user_id: user.id,
    status: 'PENDING',
    razorpay_order_id: order.id,
  })

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
