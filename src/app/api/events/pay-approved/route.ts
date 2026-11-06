import { NextResponse } from 'next/server'
import { z } from 'zod'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * Start checkout for an invite-only approval on a paid event.
 *
 * The row is already AWAITING_PAYMENT with its price snapshotted at approval,
 * so this only creates a Razorpay order for that amount and links it. The
 * amount is read from the row, never from the request. Confirmation happens
 * in verify-payment / the webhook, through confirm_registration, exactly as
 * for an ordinary paid registration.
 *
 * Every click creates a fresh order. A stale order paid in an old tab is still
 * recovered: the receipt is the registration id, which is what the webhook's
 * receipt fallback looks up.
 */

const BodySchema = z.object({ registrationId: z.string().min(1).max(64) })

/** Checkout starts are cheap to retry and expensive to spam. */
const PAY_LIMIT = { limit: 10, windowMs: 60_000 }

/** Same grace the approve function and check-in use. */
const CONCLUDED_GRACE_MS = 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  if (!checkRateLimit(request, PAY_LIMIT).ok) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a minute and try again.' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { registrationId } = parsed.data

  const { data: reg } = await adminClient
    .from('event_registrations')
    .select('id, user_id, status, amount_due_paise, events(name, slug, event_date, end_date)')
    .eq('id', registrationId)
    .maybeSingle()

  // Someone else's id reads as missing, not forbidden: no existence oracle.
  if (!reg || reg.user_id !== user.id) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  }
  if (reg.status !== 'AWAITING_PAYMENT') {
    return NextResponse.json({ error: 'There is nothing to pay for this registration.' }, { status: 409 })
  }

  const event = reg.events as unknown as { name: string; slug: string; event_date: string | null; end_date: string | null } | null
  const endsAt = event?.end_date ?? event?.event_date
  if (endsAt && new Date(endsAt).getTime() < Date.now() - CONCLUDED_GRACE_MS) {
    return NextResponse.json({ error: 'This event has concluded.' }, { status: 409 })
  }

  const amount = reg.amount_due_paise ?? 0
  if (amount <= 0) {
    console.error('[pay-approved] AWAITING_PAYMENT row with no amount due', { registrationId })
    return NextResponse.json({ error: 'Could not start payment. Please contact support.' }, { status: 500 })
  }

  const razorpay = new Razorpay({
    key_id: process.env.STRIDE_RAZORPAY_KEY_ID ?? '',
    key_secret: process.env.STRIDE_RAZORPAY_KEY_SECRET ?? '',
  })

  let order
  try {
    order = await razorpay.orders.create({ amount, currency: 'INR', receipt: registrationId })
  } catch (err) {
    console.error('[pay-approved] Razorpay order creation failed', err)
    return NextResponse.json({ error: 'Payment initialisation failed' }, { status: 500 })
  }

  // Status stays AWAITING_PAYMENT; the compare-and-swap means a row revoked a
  // moment ago is not given an order.
  const { data: linked, error: linkError } = await adminClient
    .from('event_registrations')
    .update({ razorpay_order_id: order.id, updated_at: new Date().toISOString() })
    .eq('id', registrationId)
    .eq('status', 'AWAITING_PAYMENT')
    .select('id')

  if (linkError || !linked?.length) {
    if (linkError) console.error('[pay-approved] Failed to attach order id', linkError)
    return NextResponse.json({ error: 'Payment initialisation failed' }, { status: 409 })
  }

  return NextResponse.json({
    registrationId,
    slug: event?.slug ?? null,
    razorpayOrderId: order.id,
    amount,
    currency: 'INR',
    eventName: event?.name ?? null,
    userEmail: user.email ?? null,
  })
}
