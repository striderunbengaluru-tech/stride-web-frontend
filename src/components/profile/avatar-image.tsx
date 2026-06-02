'use client'

import { useState } from 'react'

type Props = {
  src: string
  alt: string
  className?: string
  /** Tier frame colour applied to the avatar border. */
  frameColor?: string
}

export function AvatarImage({ src, alt, className, frameColor }: Props) {
  const [failed, setFailed] = useState(false)
  const frameStyle = frameColor ? { borderColor: frameColor } : undefined

  if (failed) {
    return (
      <div
        className='w-36 h-36 sm:w-44 sm:h-44 rounded-lg bg-stride-yellow-accent/20 border-4 border-stride-purple-primary flex items-center justify-center'
        style={frameStyle}
      >
        <span className='text-stride-yellow-accent text-5xl font-bold'>
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
      style={frameStyle}
      loading='lazy'
      fetchPriority='low'
      referrerPolicy='no-referrer'
      onError={() => setFailed(true)}
    />
  )
}
