import { NextResponse, after } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { adminClient } from '@/lib/supabase/admin'
import { sendConfirmationEmailOnce } from '@/lib/email/send-hooks'

function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.STRIDE_RAZORPAY_WEBHOOK_SECRET ?? ''
  if (!secret) return false
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { event: string; payload?: { payment?: { entity?: { order_id?: string; id?: string } } } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event.event ?? ''
  const orderId = event.payload?.payment?.entity?.order_id ?? ''
  const paymentId = event.payload?.payment?.entity?.id ?? ''

  if (!orderId) return NextResponse.json({ ok: true })

  if (eventType === 'payment.captured') {
    // Fetch current status first (idempotency — skip if already CONFIRMED)
    const { data: reg } = await adminClient
      .from('event_registrations')
      .select('id, status')
      .eq('razorpay_order_id', orderId)
      .maybeSingle()

    if (reg && reg.status !== 'CONFIRMED') {
      await adminClient
        .from('event_registrations')
        .update({
          status: 'CONFIRMED',
          razorpay_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('razorpay_order_id', orderId)

      // Atomic claim inside prevents a double-send if verify-payment
      // confirms the same registration concurrently.
      after(() => sendConfirmationEmailOnce(reg.id))
    }
  } else if (eventType === 'payment.failed') {
    await adminClient
      .from('event_registrations')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('razorpay_order_id', orderId)
      .neq('status', 'CONFIRMED') // never cancel an already-confirmed registration
  }

  return NextResponse.json({ ok: true })
}
