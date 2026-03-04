import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { adminClient } from '@/lib/supabase/admin'

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
    await adminClient
      .from('event_registrations')
      .update({
        status: 'CONFIRMED',
        cashfree_payment_id: String(paymentId),
        updated_at: new Date().toISOString(),
      })
      .eq('cashfree_order_id', orderId)
  } else if (eventType === 'PAYMENT_FAILED_WEBHOOK') {
    await adminClient
      .from('event_registrations')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('cashfree_order_id', orderId)
  }

  return NextResponse.json({ ok: true })
}
