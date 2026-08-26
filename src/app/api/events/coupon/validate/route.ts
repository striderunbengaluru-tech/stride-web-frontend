import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { findActiveCoupon } from '@/lib/events/coupon-lookup'
import { applyCoupon } from '@/lib/events/coupons'
import { validateCouponSchema } from '@/lib/validations/events'
import { sumPackageAmountPaise, type EventPackage } from '@/types/event'

// POST /api/events/coupon/validate
//
// Previews what a coupon does to this member's total, so the modal can show the
// discount before they commit. It decides nothing: the register route re-resolves
// the same code at submit and that result is the one that reaches Razorpay. This
// endpoint existing does not mean a code is still live a minute later.
//
// Signed-in only. An open endpoint here is a code brute-forcer, and requiring a
// session is the proportionate mitigation while the repo has no rate-limit
// utility — it bounds an attacker to accounts they can create rather than to
// bandwidth. A real per-user throttle is the follow-up.

/** One message for every failure. See findActiveCoupon for why. */
const INVALID = 'This coupon is not valid.'

function invalid() {
  // 200, not 4xx: "this code doesn't work" is a successful answer to the
  // question asked, and it keeps the client's error handling for genuine
  // failures (network, auth) separate from a negative result.
  return NextResponse.json({ valid: false, error: INVALID })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = validateCouponSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a coupon code' }, { status: 400 })
  }
  const { eventId, code, selectedPackageIds } = parsed.data

  const coupon = await findActiveCoupon(eventId, code)
  if (!coupon) return invalid()

  // ── Subtotal, resolved from the event's own prices ──────────────────────────
  // The client sends package ids, never amounts — same rule as the register
  // route. Tier availability is deliberately NOT checked here: this is a price
  // preview, and the register route is the boundary that refuses a tier that
  // isn't on offer. Checking it twice would only let the two drift.
  const { data: event } = await adminClient
    .from('events')
    .select('price_paise, packages, packages_enabled, invite_only')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.invite_only === true) return invalid()

  let subtotalPaise = event.price_paise ?? 0

  if (event.packages_enabled) {
    let defined: EventPackage[] = []
    try { defined = JSON.parse(event.packages ?? '[]') as EventPackage[] }
    catch { defined = [] }

    const chosen = [...new Set(selectedPackageIds)]
      .map(id => defined.find(pkg => pkg.id === id))
      .filter((pkg): pkg is EventPackage => pkg !== undefined)

    // Nothing picked yet. Not an invalid coupon — the member simply has to
    // choose a package before there is a total to discount.
    if (chosen.length === 0) {
      return NextResponse.json({
        valid: false,
        error: 'Choose a package first, then apply your coupon.',
      })
    }

    subtotalPaise = sumPackageAmountPaise(chosen)
  }

  // A coupon on a free total is meaningless and would render as "₹0 off ₹0".
  if (subtotalPaise <= 0) return invalid()

  const math = applyCoupon(subtotalPaise, coupon.percent)

  return NextResponse.json({
    valid: true,
    // Echoed back normalised so the modal displays the code the way the admin
    // authored it rather than however the member happened to type it.
    code: coupon.code,
    percent: coupon.percent,
    subtotalPaise: math.subtotalPaise,
    discountPaise: math.discountPaise,
    payablePaise: math.payablePaise,
  })
}
