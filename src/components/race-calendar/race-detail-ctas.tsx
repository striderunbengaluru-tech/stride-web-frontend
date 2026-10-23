'use client'

import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'

type Props = {
  registrationUrl: string | null
  couponCode: string | null
  /** Whole percent off, shown beside the code when known. */
  discountPercent?: number | null
  /** False once the deadline or race day has passed — both CTAs are then withheld. */
  open: boolean
  /**
   * stacked: coupon above a full-width register button (detail card, calendar popover).
   * row: both on one line (sticky mobile dock).
   */
  layout?: 'stacked' | 'row'
}

type CouponProps = {
  code: string
  discountPercent: number | null
  compact: boolean
}

/**
 * The code as a coupon stub — dashed edge, code set in spaced mono, discount
 * inline — with a quiet Copy action rather than a second heavy button.
 */
function CouponStub({ code, discountPercent, compact }: CouponProps) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-md border border-dashed border-stride-yellow-accent/40 bg-stride-yellow-accent/5',
        compact ? 'pl-3 pr-1' : 'pl-4 pr-1.5 py-1.5'
      )}
    >
      <div className='min-w-0 flex-1'>
        {/* The discount is what sells the code, so it never truncates. Stacked, it
            rides on the label line so the code keeps its own full-width line;
            in the one-line dock there is no label line, so it follows the code. */}
        {!compact && (
          <p className='flex gap-1.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-white/45'>
            Code
            {discountPercent && <span className='text-stride-yellow-accent'>· {discountPercent}% off</span>}
          </p>
        )}
        <p className='flex min-w-0 items-baseline gap-2'>
          <span className='truncate font-mono text-sm font-semibold tracking-[0.14em] text-white select-all'>{code}</span>
          {compact && discountPercent && (
            <span className='shrink-0 whitespace-nowrap text-xs font-medium text-stride-yellow-accent'>{discountPercent}% off</span>
          )}
        </p>
      </div>
      <button
        type='button'
        onClick={() => { void copy(code) }}
        aria-label={compact ? `Copy code ${code}` : undefined}
        className='inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stride-yellow-accent'
      >
        {copied
          ? <Check size={14} className='text-stride-yellow-accent' aria-hidden='true' />
          : <Copy size={14} aria-hidden='true' />}
        <span aria-live='polite' className={compact ? 'sr-only' : undefined}>{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  )
}

/**
 * The two things a runner can do with a race: copy Stride's coupon code, then
 * go to the organiser's page. The code comes first so it is on the clipboard
 * before they leave. Either may be absent, never both — the schema and the
 * database both enforce that.
 */
export function RaceDetailCtas({ registrationUrl, couponCode, discountPercent = null, open, layout = 'stacked' }: Props) {
  if (!open) {
    return <p className='text-white/50 text-sm'>Registration for this race has closed.</p>
  }

  const row = layout === 'row'

  return (
    <div className={row ? 'flex items-stretch gap-2' : 'flex flex-col gap-2.5'}>
      {couponCode && (
        <div className={row ? 'min-w-0 flex-1 flex' : undefined}>
          <CouponStub code={couponCode} discountPercent={discountPercent} compact={row} />
        </div>
      )}
      {registrationUrl && (
        <a
          href={registrationUrl}
          target='_blank'
          rel='noopener noreferrer nofollow'
          className={cn(
            'group inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-stride-yellow-accent px-5 text-sm font-semibold tracking-tight text-copy-black transition-colors hover:bg-stride-yellow-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stride-yellow-accent',
            row ? (couponCode ? 'shrink-0' : 'flex-1') : 'w-full'
          )}
        >
          {row ? 'Register' : <>Register on organiser&apos;s site</>}
          <ArrowUpRight size={16} className='transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5' aria-hidden='true' />
          <span className='sr-only'>(opens in a new tab)</span>
        </a>
      )}
    </div>
  )
}
