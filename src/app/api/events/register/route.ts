import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
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
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { eventId } = parsed.data

  // Fetch the event
  const { data: event } = await adminClient
    .from('events')
    .select('id, name, slug, status, price_paise, capacity')
    .eq('id', eventId)
    .single()

  if (!event || event.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Check for duplicate registration
  const { data: existing } = await adminClient
    .from('event_registrations')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already registered' }, { status: 409 })
  }

  // Check capacity
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

  // Free event — confirm immediately
  if (event.price_paise === 0) {
    await adminClient.from('event_registrations').insert({
      id: nanoid(),
      event_id: eventId,
      user_id: user.id,
      status: 'CONFIRMED',
    })
    return NextResponse.json({ registered: true })
  }

  // Paid event — create Cashfree order
  const orderId = `STRIDE-${nanoid(10)}`
  const appId = process.env.STRIDE_CASHFREE_APP_ID
  const secretKey = process.env.STRIDE_CASHFREE_SECRET_KEY
  const env = process.env.STRIDE_CASHFREE_ENV ?? 'sandbox'

  const cashfreeBase =
    env === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg'

  // Fetch display name for Cashfree customer_name
  const { data: profile } = await adminClient
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const orderRes = await fetch(`${cashfreeBase}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': appId ?? '',
      'x-client-secret': secretKey ?? '',
    },
    body: JSON.stringify({
      order_id: orderId,
      order_amount: event.price_paise / 100,
      order_currency: 'INR',
      customer_details: {
        customer_id: user.id,
        customer_name: profile?.full_name ?? user.email ?? 'Stride Member',
        customer_email: user.email ?? '',
        customer_phone: '9999999999', // Cashfree requires phone; placeholder
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/events/${event.slug}?order_id=${orderId}`,
        notify_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/cashfree`,
      },
    }),
  })

  if (!orderRes.ok) {
    const errBody = await orderRes.text()
    console.error('[Cashfree] Order creation failed:', errBody)
    return NextResponse.json({ error: 'Payment initiation failed' }, { status: 502 })
  }

  const orderData = await orderRes.json()

  // Create PENDING registration
  await adminClient.from('event_registrations').insert({
    id: nanoid(),
    event_id: eventId,
    user_id: user.id,
    status: 'PENDING',
    cashfree_order_id: orderId,
  })

  return NextResponse.json({ paymentSessionId: orderData.payment_session_id, orderId })
}
