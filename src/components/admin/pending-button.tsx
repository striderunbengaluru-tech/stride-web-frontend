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
    <button type='submit' disabled={pending} className={className}>
      {pending ? (
        <span className='flex items-center gap-1.5'>
          <Spinner className='w-3 h-3' />
          {pendingLabel ?? children}
        </span>
      ) : children}
    </button>
  )
}
