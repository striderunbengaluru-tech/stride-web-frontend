import { ExternalLink } from 'lucide-react'
import { CopyButton } from '@/components/ui/copy-button'

type Props = {
  registrationUrl: string | null
  couponCode: string | null
  /** False once the deadline or race day has passed — both CTAs are then withheld. */
  open: boolean
  /** Side-by-side on the sticky mobile bar; stacked in the desktop panel. */
  layout?: 'stacked' | 'row'
}

/**
 * The two things a runner can do with a race: go to the organiser's page, or
 * copy Stride's coupon code. Either may be absent, never both — the schema and
 * the database both enforce that.
 */
export function RaceDetailCtas({ registrationUrl, couponCode, open, layout = 'stacked' }: Props) {
  if (!open) {
    return <p className='text-white/50 text-sm'>Registration for this race has closed.</p>
  }

  return (
    <div className={layout === 'row' ? 'flex gap-2' : 'flex flex-col gap-3'}>
      {registrationUrl && (
        <a
          href={registrationUrl}
          target='_blank'
          rel='noopener noreferrer nofollow'
          className={`inline-flex items-center justify-center gap-2 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm px-5 py-3 min-h-11 hover:bg-stride-yellow-accent/90 transition-colors ${layout === 'row' ? 'flex-1' : 'w-full'}`}
        >
          Register on organiser&apos;s site
          <ExternalLink size={15} aria-hidden='true' />
          <span className='sr-only'>(opens in a new tab)</span>
        </a>
      )}
      {couponCode && (
        <div className={`flex items-stretch gap-2 ${layout === 'row' ? 'flex-1 min-w-0' : ''}`}>
          {layout === 'stacked' && (
            <div className='flex-1 min-w-0 rounded-md border border-white/15 bg-white/5 px-4 py-2 flex flex-col justify-center'>
              <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest'>Stride coupon</p>
              <p className='text-white font-mono font-bold text-base truncate select-all'>{couponCode}</p>
            </div>
          )}
          <CopyButton
            value={couponCode}
            label={layout === 'row' ? `Copy ${couponCode}` : 'Copy code'}
            copiedLabel='Copied!'
            variant={registrationUrl ? 'ghost' : 'solid'}
            className={layout === 'row' ? 'flex-1 min-w-0 truncate' : 'shrink-0'}
          />
        </div>
      )}
    </div>
  )
}
