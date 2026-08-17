import { NextResponse, after } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { eventRegsTag } from '@/lib/data/events'
import { createHmac, timingSafeEqual } from 'crypto'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { sendConfirmationEmailOnce } from '@/lib/email/send-hooks'

function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.STRIDE_RAZORPAY_KEY_SECRET ?? ''
  const body = `${orderId}|${paymentId}`
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId } = await request.json()

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !registrationId) {
    return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 })
  }

  // 1) The client-callback signature proves this (order_id, payment_id) pair
  // was issued by Razorpay — a client cannot forge it without the key secret.
  if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  // 2) The registration must belong to this user, carry the matching order id,
  // and be PENDING. We also pull the event's canonical price for the amount
  // check below — the amount is never trusted from the client.
  const { data: registration } = await adminClient
    .from('event_registrations')
    .select('id, user_id, status, event_id, razorpay_order_id, amount_due_paise, events(slug, price_paise)')
    .eq('id', registrationId)
    .single()

  if (!registration || registration.user_id !== user.id) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  }

  if (registration.razorpay_order_id !== razorpay_order_id) {
    return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 })
  }

  const event = registration.events as unknown as { slug: string; price_paise: number } | null
  const eventSlug = event?.slug ?? null

  // Idempotent: already confirmed is fine
  if (registration.status === 'CONFIRMED') {
    revalidateTag(eventRegsTag(registration.event_id), { expire: 0 })
    if (eventSlug) revalidatePath(`/events/${eventSlug}`)
    return NextResponse.json({ success: true })
  }

  if (registration.status !== 'PENDING') {
    return NextResponse.json({ error: 'Registration is not in a confirmable state' }, { status: 400 })
  }

  // 3) Server-side source of truth: fetch the payment straight from Razorpay and
  // require it to be actually CAPTURED, tied to THIS order, for the EXACT amount
  // the event costs. This is what makes the flow unspoofable — even a valid
  // signature is not enough; the money must have really been captured.
  const razorpay = new Razorpay({
    key_id: process.env.STRIDE_RAZORPAY_KEY_ID ?? '',
    key_secret: process.env.STRIDE_RAZORPAY_KEY_SECRET ?? '',
  })

  let payment
  try {
    payment = await razorpay.payments.fetch(razorpay_payment_id)
  } catch (err) {
    console.error('[verify-payment] Razorpay fetch failed', err)
    return NextResponse.json({ error: 'Could not verify payment. Please contact support.' }, { status: 502 })
  }

  const capturedAmount = Number(payment.amount)
  // Packages make the charge per-registration, so the expected amount is the
  // total persisted when the order was created. Falls back to the event price for
  // registrations made before packages existed — including any PENDING row still
  // in flight at deploy time, whose amount_due_paise is null.
  const expectedAmount = registration.amount_due_paise ?? event?.price_paise ?? -1

  if (payment.order_id !== razorpay_order_id || payment.status !== 'captured' || capturedAmount !== expectedAmount) {
    console.error('[verify-payment] Payment does not match order', {
      registrationId,
      status: payment.status,
      orderMatch: payment.order_id === razorpay_order_id,
      capturedAmount,
      expectedAmount,
    })
    return NextResponse.json({ error: 'Payment could not be verified' }, { status: 400 })
  }

  // 4) Confirm atomically with a final capacity guard (no oversell) and record
  // the server-verified captured amount + payment id.
  const { data: outcome, error } = await adminClient.rpc('confirm_registration', {
    p_registration_id: registrationId,
    p_razorpay_payment_id: razorpay_payment_id,
    p_amount_paid_paise: capturedAmount,
  })

  if (error) {
    console.error('[verify-payment] confirm_registration failed', error)
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 })
  }
  if (outcome === 'CAPACITY_FULL') {
    return NextResponse.json(
      { error: 'This event filled up while your payment was processing. Please contact support for a refund.' },
      { status: 409 },
    )
  }
  if (outcome !== 'CONFIRMED' && outcome !== 'ALREADY_CONFIRMED') {
    console.error('[verify-payment] Unexpected confirm outcome', outcome)
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 })
  }

  // Bust the event page's cache so back-navigation reflects the new CONFIRMED
  // state, and purge the cached confirmed-count so spots-left is exact.
  revalidateTag(eventRegsTag(registration.event_id), { expire: 0 })
  if (eventSlug) revalidatePath(`/events/${eventSlug}`)

  // Atomic claim inside prevents a double-send if the Razorpay webhook
  // confirms the same registration concurrently.
  after(() => sendConfirmationEmailOnce(registrationId))

  return NextResponse.json({ success: true })
}
