import { NextResponse, after } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createHmac, timingSafeEqual } from 'crypto'
import Razorpay from 'razorpay'
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

// Every column the confirm path below needs, kept in one place so the two
// lookups in findRegistrationForOrder cannot drift apart.
const REGISTRATION_COLUMNS =
  // `slug` rides along so the confirm below can purge the rendered event
  // page, not just the cached counts — see revalidatePath there.
  'id, status, event_id, amount_due_paise, events(price_paise, slug)'

/**
 * Resolve the registration a captured payment belongs to.
 *
 * The direct match is on razorpay_order_id. When that misses we fall back to
 * the order's `receipt`, which /api/events/register stamps with the
 * registration id at creation time. The fallback exists because a runner who
 * restarts checkout gets a NEW row and a NEW order, while the ORIGINAL order
 * stays live and payable in a stale tab — so the money can land on an order no
 * row points at. Returns null when neither lookup resolves; the caller logs
 * that loudly rather than swallowing it.
 */
async function findRegistrationForOrder(orderId: string, razorpay: Razorpay) {
  const { data: byOrder } = await adminClient
    .from('event_registrations')
    .select(REGISTRATION_COLUMNS)
    .eq('razorpay_order_id', orderId)
    .maybeSingle()

  if (byOrder) return byOrder

  let receipt: string | null = null
  try {
    const order = await razorpay.orders.fetch(orderId)
    receipt = typeof order.receipt === 'string' ? order.receipt : null
  } catch (err) {
    console.error('[razorpay-webhook] Could not fetch order for receipt fallback', { orderId, err })
    return null
  }

  if (!receipt) return null

  const { data: byReceipt } = await adminClient
    .from('event_registrations')
    .select(REGISTRATION_COLUMNS)
    .eq('id', receipt)
    .maybeSingle()

  if (byReceipt) {
    console.warn('[razorpay-webhook] Recovered registration via order receipt', {
      orderId,
      registrationId: receipt,
    })
  }

  return byReceipt
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

  const razorpay = new Razorpay({
    key_id: process.env.STRIDE_RAZORPAY_KEY_ID ?? '',
    key_secret: process.env.STRIDE_RAZORPAY_KEY_SECRET ?? '',
  })

  if (eventType === 'payment.captured') {
    // Locate the registration this order belongs to (idempotent: the RPC skips
    // an already-CONFIRMED row).
    const reg = await findRegistrationForOrder(orderId, razorpay)

    if (!reg) {
      // Money captured against an order no registration references. This branch
      // previously returned 200 in silence, which is exactly how a runner who
      // had genuinely paid sat at PENDING unnoticed until the day of the event.
      // 200 so Razorpay stops retrying — nothing here is going to resolve on a
      // redelivery — but never again without a trace.
      console.error(
        '[razorpay-webhook] CAPTURED PAYMENT WITH NO REGISTRATION — manual reconciliation needed',
        { orderId, paymentId, capturedAmount },
      )
      return NextResponse.json({ ok: true })
    }

    if (reg.status !== 'CONFIRMED') {
      // The captured amount must match what this registration actually owed.
      // This route previously confirmed on the strength of the signature alone
      // and wrote whatever amount the payload claimed. With a single fixed price
      // that was merely loose; with per-registration package totals it would
      // confirm an underpaid registration, so the check is now enforced here too
      // — not just in verify-payment.
      const linkedEvent = reg.events as unknown as { price_paise: number; slug: string | null } | null
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
        revalidateTag(eventRegsTag(reg.event_id), { expire: 0 })
        // ...and drop the rendered event page with it. The tag alone refreshes
        // the counts in the data cache; the page is ISR now, so without this a
        // visitor could be shown a spots-left figure from before the payment
        // landed. Every other confirm path (register, verify-payment, the admin
        // actions) already pairs the two — this one could not, because it had
        // only the event id to hand.
        if (linkedEvent?.slug) revalidatePath(`/events/${linkedEvent.slug}`)

        // Atomic claim inside prevents a double-send if verify-payment
        // confirms the same registration concurrently.
        after(() => sendConfirmationEmailOnce(reg.id))
      } else if (outcome !== 'ALREADY_CONFIRMED') {
        // CAPACITY_FULL, NOT_PENDING or NOT_FOUND. Each means real money was
        // captured and the seat was NOT granted, so each needs a human. Only
        // ALREADY_CONFIRMED is a genuine no-op worth staying quiet about.
        console.error('[razorpay-webhook] Captured payment did not confirm', {
          orderId,
          paymentId,
          registrationId: reg.id,
          status: reg.status,
          outcome,
        })
      }
    }
  } else if (eventType === 'payment.failed') {
    // Deliberately does NOT cancel the registration.
    //
    // Razorpay's in-checkout "Retry" reuses the SAME order id, so a failed
    // attempt is very often followed moments later by a successful one on this
    // very order. Cancelling here moved the row out of PENDING, and the
    // payment.captured that followed then hit confirm_registration's
    // `status <> 'PENDING'` guard and returned NOT_PENDING — stranding a runner
    // who had genuinely paid at CANCELLED for good. Observed in the wild on MAP
    // Fitness Rave (order_TUcW2uD3LMReEE: paid in Razorpay, CANCELLED here).
    //
    // Nothing needs releasing. The seat hold is time-based, not status-based:
    // register_for_event counts `status = 'PENDING' and created_at > now() -
    // interval '15 minutes'`, so an abandoned checkout frees its spot on its own
    // and no cache purge is warranted either — the spots-left figure is
    // unchanged by this event.
    console.warn('[razorpay-webhook] payment.failed — registration left PENDING for retry', {
      orderId,
      paymentId,
    })
  }

  return NextResponse.json({ ok: true })
}
