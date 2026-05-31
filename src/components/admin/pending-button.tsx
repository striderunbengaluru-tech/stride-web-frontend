'use client'

import { useFormStatus } from 'react-dom'
import { Spinner } from '@/components/ui/spinner'

type Props = {
  children: React.ReactNode
  className?: string
  pendingLabel?: string
}

export function PendingButton({ children, className, pendingLabel }: Props) {
  const { pending } = useFormStatus()
  return (
    <button
      type='submit'
      disabled={pending}
      // Always render as a centered flex container so both idle text and the
      // (spinner + label) pending state stay horizontally centered when the
      // button is wider than its content (e.g. inside a w-full / flex-1 form).
      className={`${className ?? ''} inline-flex items-center justify-center gap-1.5`}
    >
      {pending && <Spinner className='w-3 h-3' />}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  )
}
