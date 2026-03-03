import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { and, count, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { events, eventRegistrations } from '@/lib/db/schema'
import { registerEventSchema } from '@/lib/validations/events'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = registerEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { eventId } = parsed.data

  // Fetch the event
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event || event.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Check for duplicate registration
  const [existing] = await db
    .select({ id: eventRegistrations.id })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, session.user.id)))
    .limit(1)

  if (existing) {
    return NextResponse.json({ error: 'Already registered' }, { status: 409 })
  }

  // Check capacity
  if (event.capacity) {
    const [{ confirmedCount }] = await db
      .select({ confirmedCount: count() })
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, 'CONFIRMED')))

    if (confirmedCount >= event.capacity) {
      return NextResponse.json({ error: 'Event is full' }, { status: 409 })
    }
  }

  // Free event — confirm immediately
  if (event.pricePaise === 0) {
    const id = nanoid()
    await db.insert(eventRegistrations).values({
      id,
      eventId,
      userId: session.user.id,
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
      order_amount: event.pricePaise / 100,
      order_currency: 'INR',
      customer_details: {
        customer_id: session.user.id,
        customer_name: session.user.name,
        customer_email: session.user.email,
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
  await db.insert(eventRegistrations).values({
    id: nanoid(),
    eventId,
    userId: session.user.id,
    status: 'PENDING',
    cashfreeOrderId: orderId,
  })

  return NextResponse.json({ paymentSessionId: orderData.payment_session_id, orderId })
}
