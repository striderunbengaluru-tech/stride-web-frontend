import { StravaIcon } from '@/components/ui/brand-icons'
import { cn } from '@/lib/utils'

/**
 * Attribution required by Strava's brand guidelines wherever Strava data is
 * shown. The mark is Strava orange; the words stay white so they keep AA
 * contrast on the purple background.
 */
export function PoweredByStrava({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium text-white/60', className)}>
      <StravaIcon size={12} className='text-strava-orange' />
      Powered by Strava
    </span>
  )
}
