import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

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

  if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  // Verify the registration belongs to this user and is in PENDING state
  const { data: registration } = await adminClient
    .from('event_registrations')
    .select('id, user_id, status, razorpay_order_id')
    .eq('id', registrationId)
    .single()

  if (!registration || registration.user_id !== user.id) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  }

  if (registration.razorpay_order_id !== razorpay_order_id) {
    return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 })
  }

  // Idempotent: already confirmed is fine
  if (registration.status === 'CONFIRMED') {
    return NextResponse.json({ success: true })
  }

  if (registration.status !== 'PENDING') {
    return NextResponse.json({ error: 'Registration is not in a confirmable state' }, { status: 400 })
  }

  const { error } = await adminClient
    .from('event_registrations')
    .update({
      status: 'CONFIRMED',
      razorpay_payment_id: razorpay_payment_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', registrationId)

  if (error) {
    console.error('[verify-payment] update error', error)
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
