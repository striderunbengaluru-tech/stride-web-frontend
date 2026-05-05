'use client'

import type { ReactNode } from 'react'

type Props = {
  targetId: string
  className?: string
  children: ReactNode
}

export default function SmoothScrollLink({ targetId, className, children }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <a href={`#${targetId}`} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}
