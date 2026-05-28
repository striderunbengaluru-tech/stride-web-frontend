'use client'

import { useState } from 'react'

type Props = {
  src: string
  alt: string
  className?: string
}

export function AvatarImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className='w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-stride-yellow-accent/20 border-4 border-stride-purple-primary flex items-center justify-center'>
        <span className='text-stride-yellow-accent text-4xl font-bold'>
          {alt.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading='lazy'
      fetchPriority='low'
      referrerPolicy='no-referrer'
      onError={() => setFailed(true)}
    />
  )
}
