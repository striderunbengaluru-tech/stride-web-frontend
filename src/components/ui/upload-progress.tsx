import { RotateCcw } from 'lucide-react'

type Props = {
  /** Current upload state. */
  status: 'uploading' | 'error'
  /** Integer 0–100. Only used while uploading. */
  progress?: number
  /** Error message shown in the error state. */
  message?: string
  /** Called when the user taps Retry (error state only). */
  onRetry?: () => void
  className?: string
}

// Shared upload feedback: a yellow progress bar with a percentage while a file
// streams, and a retry affordance when an upload fails. Used by every image
// uploader (avatar, gallery, cover, admin banners).
export function UploadProgress({ status, progress = 0, message, onRetry, className = '' }: Props) {
  if (status === 'error') {
    return (
      <div className={`flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2.5 ${className}`}>
        <p className='flex-1 min-w-0 text-red-400 text-xs leading-snug line-clamp-2'>
          {message ?? 'Upload failed. Please try again.'}
        </p>
        {onRetry && (
          <button
            type='button'
            onClick={onRetry}
            className='shrink-0 inline-flex items-center gap-1.5 rounded-md bg-stride-yellow-accent text-copy-black text-xs font-semibold px-3 py-1.5 hover:bg-stride-yellow-accent/90 transition-colors min-h-9'
          >
            <RotateCcw size={13} />
            Retry
          </button>
        )}
      </div>
    )
  }

  const pct = Math.min(100, Math.max(0, progress))
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className='flex-1 h-2 rounded-full bg-white/10 overflow-hidden'>
        <div
          className='h-full bg-stride-yellow-accent rounded-full transition-[width] duration-200 ease-out'
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className='shrink-0 text-white/70 text-xs font-semibold tabular-nums w-9 text-right'>{pct}%</span>
    </div>
  )
}
