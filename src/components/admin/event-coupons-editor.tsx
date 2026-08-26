'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Tag, Trash2, Plus, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  upsertEventCouponAction,
  setCouponActiveAction,
  deleteEventCouponAction,
} from '@/lib/actions/admin'
import { applyCoupon, normaliseCouponCode } from '@/lib/events/coupons'
import { formatRupees } from '@/lib/utils/money'
import { MAX_COUPONS, type EventCoupon, type EventPackage } from '@/types/event'

// The coupon list for one event.
//
// Separate from EventForm on purpose. Coupons are rows in event_coupons, not a
// column on the event, so each action here writes immediately rather than
// waiting for the form's save — which is what makes a revoke instant and stops
// two admins editing the same event from clobbering each other's list.
//
// Consequence worth knowing: coupons can only be managed on an event that
// already exists, because a row needs an event_id to point at.

type Props = {
  /** Null while creating an event — there is nothing to attach a coupon to yet. */
  eventId: string | null
  coupons: EventCoupon[]
  /** Live form state, so the preview tracks what the admin is typing. */
  pricePaise: number
  packages: EventPackage[]
  packagesEnabled: boolean
  /** False greys the whole block out — the codes stay, they just do nothing. */
  couponsEnabled: boolean
}

/**
 * What a percentage does to this event's price, in the admin's own terms.
 *
 * A package event gets a line per tier rather than one blended figure: under
 * progressive pricing the tiers are different prices, so a single number would
 * be wrong for all but one of them.
 */
function PricePreview({
  percent, pricePaise, packages, packagesEnabled,
}: { percent: number; pricePaise: number; packages: EventPackage[]; packagesEnabled: boolean }) {
  const rows = packagesEnabled && packages.length > 0
    ? packages.map(pkg => ({ label: pkg.name, subtotal: pkg.amountPaise }))
    : [{ label: null, subtotal: pricePaise }]

  return (
    <div className='mt-1.5 flex flex-col gap-0.5'>
      {rows.map((row, i) => {
        const math = applyCoupon(row.subtotal, percent)
        if (row.subtotal <= 0) {
          return (
            <p key={i} className='text-white/30 text-xs'>
              {row.label ? `${row.label}: ` : ''}already free, nothing to discount
            </p>
          )
        }
        return (
          <p key={i} className='text-white/40 text-xs tabular-nums'>
            {row.label && <span className='text-white/30'>{row.label}: </span>}
            <span className='line-through'>{formatRupees(row.subtotal)}</span>
            {' → '}
            <span className='text-stride-yellow-accent font-semibold'>
              {math.payablePaise === 0 ? 'Free' : formatRupees(math.payablePaise)}
            </span>
            {math.snappedToFree && (
              <span className='text-white/30'> (under ₹1 after the discount, so it is taken as free)</span>
            )}
          </p>
        )
      })}
    </div>
  )
}

export function EventCouponsEditor({
  eventId, coupons, pricePaise, packages, packagesEnabled, couponsEnabled,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [newCode, setNewCode] = useState('')
  const [newPercent, setNewPercent] = useState('')

  const inputBase = 'w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/60'

  if (!eventId) {
    return (
      <p className='text-white/40 text-xs'>
        Save the event first, then add coupon codes here.
      </p>
    )
  }

  // Captured after the guard: the narrowing above does not survive into the
  // handlers below, since a destructured prop is not a stable binding to TS.
  const id = eventId

  function run(fn: () => Promise<{ error: string } | void>, successMessage: string) {
    startTransition(async () => {
      const result = await fn()
      if (result?.error) toast.error(result.error)
      else toast.success(successMessage)
    })
  }

  function handleAdd() {
    const code = normaliseCouponCode(newCode)
    const percent = Number(newPercent)

    // Checked here as well as in the action so the admin gets the message
    // without a round trip. The action is still the authority.
    if (code.length < 3) return toast.error('A coupon code needs at least 3 characters')
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      return toast.error('Enter a whole discount between 1 and 100')
    }

    run(
      async () => {
        const result = await upsertEventCouponAction(id, { code, percent })
        if (!result?.error) { setNewCode(''); setNewPercent('') }
        return result
      },
      `${code} added`,
    )
  }

  return (
    <div className={couponsEnabled ? '' : 'opacity-50'}>
      {coupons.length > 0 && (
        <ul className='flex flex-col gap-2 mb-3'>
          {coupons.map(coupon => (
            <li
              key={coupon.id}
              className='bg-white/5 border border-white/10 rounded-xl p-3'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className='font-mono text-sm font-bold text-white tracking-wide'>
                      {coupon.code}
                    </span>
                    <span className='text-xs font-semibold text-stride-yellow-accent bg-stride-yellow-accent/12 border border-stride-yellow-accent/25 rounded px-1.5 py-0.5 tabular-nums'>
                      {coupon.percent}% off
                    </span>
                    {!coupon.active && (
                      <span className='text-xs text-white/40 bg-white/8 rounded px-1.5 py-0.5'>
                        Revoked
                      </span>
                    )}
                  </div>
                  <PricePreview
                    percent={coupon.percent}
                    pricePaise={pricePaise}
                    packages={packages}
                    packagesEnabled={packagesEnabled}
                  />
                </div>

                <div className='flex items-center gap-2 shrink-0'>
                  <Switch
                    checked={coupon.active}
                    disabled={pending}
                    onCheckedChange={(v) => run(
                      () => setCouponActiveAction(coupon.id, v),
                      v ? `${coupon.code} is live` : `${coupon.code} revoked`,
                    )}
                    label={`${coupon.active ? 'Revoke' : 'Re-enable'} coupon ${coupon.code}`}
                  />
                  <button
                    type='button'
                    disabled={pending}
                    onClick={() => run(
                      () => deleteEventCouponAction(coupon.id),
                      `${coupon.code} deleted`,
                    )}
                    aria-label={`Delete coupon ${coupon.code}`}
                    className='min-h-11 min-w-11 grid place-items-center text-white/30 hover:text-red-400 transition-colors disabled:opacity-40'
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {coupons.length < MAX_COUPONS ? (
        <div className='flex flex-col sm:flex-row gap-2 sm:items-center'>
          <input
            type='text'
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder='STRIDE25'
            maxLength={40}
            aria-label='New coupon code'
            autoComplete='off'
            className={`${inputBase} font-mono uppercase sm:flex-1`}
          />
          <div className='flex items-center gap-2'>
            <input
              type='number'
              value={newPercent}
              onChange={(e) => setNewPercent(e.target.value)}
              placeholder='25'
              min={1}
              max={100}
              step={1}
              aria-label='Discount percentage'
              className={`${inputBase} w-20 tabular-nums`}
            />
            <span className='text-white/40 text-sm'>%</span>
            <button
              type='button'
              onClick={handleAdd}
              disabled={pending}
              className='min-h-11 inline-flex items-center gap-1.5 rounded-md bg-stride-yellow-accent px-4 text-sm font-bold text-copy-black hover:opacity-90 disabled:opacity-50 transition-opacity'
            >
              {pending ? <Loader2 size={14} className='animate-spin' /> : <Plus size={14} />}
              Add
            </button>
          </div>
        </div>
      ) : (
        <p className='text-white/40 text-xs'>
          {MAX_COUPONS} coupons is the maximum for one event. Delete one to add another.
        </p>
      )}

      {newPercent !== '' && Number(newPercent) >= 1 && Number(newPercent) <= 100 && (
        <div className='mt-2 flex items-start gap-1.5'>
          <Tag size={12} className='text-white/30 mt-0.5 shrink-0' />
          <PricePreview
            percent={Number(newPercent)}
            pricePaise={pricePaise}
            packages={packages}
            packagesEnabled={packagesEnabled}
          />
        </div>
      )}
    </div>
  )
}
