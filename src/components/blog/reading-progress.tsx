'use client'

import { useEffect, useState } from 'react'

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const scrolled = doc.scrollTop || document.body.scrollTop
      const total = doc.scrollHeight - doc.clientHeight
      setProgress(total > 0 ? (scrolled / total) * 100 : 0)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className='fixed top-0 left-0 right-0 z-50 h-0.5 bg-white/10'
      aria-hidden='true'
    >
      <div
        className='h-full bg-stride-yellow-accent transition-none'
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
