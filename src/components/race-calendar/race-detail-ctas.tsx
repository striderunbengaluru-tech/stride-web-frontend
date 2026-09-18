import { ExternalLink } from 'lucide-react'
import { CopyButton } from '@/components/ui/copy-button'

type Props = {
  registrationUrl: string | null
  couponCode: string | null
  /** Whole percent off, shown beside the code when known. */
  discountPercent?: number | null
  /** False once the deadline or race day has passed — both CTAs are then withheld. */
  open: boolean
  /**
   * stacked / compact: register button above the coupon row (detail panel, hero, calendar card).
   * row: both CTAs side by side with tighter coupon padding (sticky mobile bar).
   */
  layout?: 'stacked' | 'row' | 'compact'
}

/**
 * The two things a runner can do with a race: go to the organiser's page, or
 * copy Stride's coupon code. Either may be absent, never both — the schema and
 * the database both enforce that.
 */
export function RaceDetailCtas({ registrationUrl, couponCode, discountPercent = null, open, layout = 'stacked' }: Props) {
  if (!open) {
    return <p className='text-white/50 text-sm'>Registration for this race has closed.</p>
  }

  return (
    <div className={layout === 'row' ? 'flex gap-2' : 'flex flex-col gap-2.5'}>
      {registrationUrl && (
        <a
          href={registrationUrl}
          target='_blank'
          rel='noopener noreferrer nofollow'
          className={`inline-flex items-center justify-center gap-2 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm px-5 py-3 min-h-11 hover:bg-stride-yellow-accent/90 transition-colors ${layout === 'row' ? 'flex-1' : 'w-full'}`}
        >
          {layout === 'row' ? 'Register' : <>Register on organiser&apos;s site</>}
          <ExternalLink size={15} aria-hidden='true' />
          <span className='sr-only'>(opens in a new tab)</span>
        </a>
      )}
      {couponCode && (
        <div className={`flex items-stretch gap-2 ${layout === 'row' ? 'shrink-0 max-w-[60%]' : ''}`}>
          <div className={`flex-1 min-w-0 rounded-md border border-white/15 bg-white/5 flex flex-col justify-center ${layout === 'row' ? 'px-3' : 'px-4 py-2'}`}>
            {layout !== 'row' && (
              <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest truncate'>{layout === 'compact' ? 'Coupon' : 'Stride coupon'}</p>
            )}
            <p className={`text-white font-mono font-bold truncate select-all ${layout === 'row' ? 'text-sm' : 'text-base'}`}>{couponCode}</p>
          </div>
          {discountPercent && (
            <p className={`shrink-0 inline-flex items-center rounded-md border border-stride-yellow-accent/40 bg-stride-yellow-accent/15 font-bold text-stride-yellow-accent ${layout === 'row' ? 'px-2 text-xs' : 'px-3 text-sm'}`}>
              {discountPercent}% off
            </p>
          )}
          <CopyButton
            value={couponCode}
            label={`Copy code ${couponCode}`}
            copiedLabel='Copied'
            variant={registrationUrl ? 'ghost' : 'solid'}
            iconOnly
            className='shrink-0'
          />
        </div>
      )}
    </div>
  )
}
