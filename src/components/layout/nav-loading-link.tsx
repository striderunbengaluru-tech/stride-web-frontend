'use client'

import Link from 'next/link'
import { useLinkStatus } from 'next/link'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

// Navigation link with built-in pending feedback: while the route the link
// points to is loading, the label turns yellow and a small spinner appears —
// so a tap never looks like it did nothing (which reads as a dead link,
// especially on slow mobile connections).
function LinkBody({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus()
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 transition-colors',
        pending && 'text-stride-yellow-accent'
      )}
    >
      {children}
      {pending && (
        <Loader2 size={12} className='animate-spin shrink-0' aria-hidden='true' />
      )}
    </span>
  )
}

type Props = {
  href: string
  className?: string
  children: React.ReactNode
}

export function NavLoadingLink({ href, className, children }: Props) {
  return (
    <Link href={href} className={className}>
      <LinkBody>{children}</LinkBody>
    </Link>
  )
}
