import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { eventRegistrations } from '@/lib/db/schema'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-webhook-signature') ?? ''
  const timestamp = request.headers.get('x-webhook-timestamp') ?? ''

  const secret = process.env.STRIDE_CASHFREE_SECRET_KEY ?? ''
  const expectedSig = createHmac('sha256', secret)
    .update(timestamp + rawBody)
    .digest('base64')

  if (signature !== expectedSig) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const orderId: string = event?.data?.order?.order_id ?? ''
  const paymentId: string = event?.data?.payment?.cf_payment_id ?? ''
  const eventType: string = event?.type ?? ''

  if (!orderId) return NextResponse.json({ ok: true })

  if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
    await db
      .update(eventRegistrations)
      .set({ status: 'CONFIRMED', cashfreePaymentId: String(paymentId), updatedAt: new Date() })
      .where(eq(eventRegistrations.cashfreeOrderId, orderId))
  } else if (eventType === 'PAYMENT_FAILED_WEBHOOK') {
    await db
      .update(eventRegistrations)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(eventRegistrations.cashfreeOrderId, orderId))
  }

  return NextResponse.json({ ok: true })
}
