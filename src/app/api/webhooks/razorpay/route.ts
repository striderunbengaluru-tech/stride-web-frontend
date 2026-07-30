import { NextResponse, after } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createHmac, timingSafeEqual } from 'crypto'
import { adminClient } from '@/lib/supabase/admin'
import { eventRegsTag } from '@/lib/data/events'
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

  let event: { event: string; payload?: { payment?: { entity?: { order_id?: string; id?: string; amount?: number | string } } } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event.event ?? ''
  const orderId = event.payload?.payment?.entity?.order_id ?? ''
  const paymentId = event.payload?.payment?.entity?.id ?? ''
  const capturedAmount = Number(event.payload?.payment?.entity?.amount ?? 0)

  if (!orderId) return NextResponse.json({ ok: true })

  if (eventType === 'payment.captured') {
    // Locate the registration this order belongs to (idempotent: the RPC skips
    // an already-CONFIRMED row).
    const { data: reg } = await adminClient
      .from('event_registrations')
      .select('id, status, event_id, amount_due_paise, events(price_paise)')
      .eq('razorpay_order_id', orderId)
      .maybeSingle()

    if (reg && reg.status !== 'CONFIRMED') {
      // The captured amount must match what this registration actually owed.
      // This route previously confirmed on the strength of the signature alone
      // and wrote whatever amount the payload claimed. With a single fixed price
      // that was merely loose; with per-registration package totals it would
      // confirm an underpaid registration, so the check is now enforced here too
      // — not just in verify-payment.
      const linkedEvent = reg.events as unknown as { price_paise: number } | null
      const expectedAmount = reg.amount_due_paise ?? linkedEvent?.price_paise ?? -1

      if (capturedAmount !== expectedAmount) {
        console.error('[razorpay-webhook] Captured amount does not match amount due', {
          registrationId: reg.id,
          capturedAmount,
          expectedAmount,
        })
        // 200 so Razorpay stops retrying a payload that will never be valid; the
        // registration stays PENDING for manual review.
        return NextResponse.json({ ok: true })
      }

      // Same atomic, capacity-guarded confirm path as verify-payment — records
      // the captured amount and never oversells.
      const { data: outcome } = await adminClient.rpc('confirm_registration', {
        p_registration_id: reg.id,
        p_razorpay_payment_id: paymentId,
        p_amount_paid_paise: capturedAmount,
      })

      if (outcome === 'CONFIRMED') {
        // Keep the cached confirmed-count (spots-left) exact after webhook confirms
        revalidateTag(eventRegsTag(reg.event_id), 'max')

        // Atomic claim inside prevents a double-send if verify-payment
        // confirms the same registration concurrently.
        after(() => sendConfirmationEmailOnce(reg.id))
      }
    }
  } else if (eventType === 'payment.failed') {
    const { data: cancelled } = await adminClient
      .from('event_registrations')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('razorpay_order_id', orderId)
      .neq('status', 'CONFIRMED') // never cancel an already-confirmed registration
      .select('event_id')
      .maybeSingle()
    if (cancelled) revalidateTag(eventRegsTag(cancelled.event_id), 'max')
  }

  return NextResponse.json({ ok: true })
}
