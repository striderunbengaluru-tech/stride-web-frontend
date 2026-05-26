'use client'

import { useRef, useEffect, useState } from 'react'
import type { Partner } from '@/app/partnerships/partners-data'

type Props = {
  partners: Partner[]
}

function MarqueeItem({ partner }: { partner: Partner }) {
  const [logoError, setLogoError] = useState(false)

  return (
    <div className='shrink-0 flex items-center justify-center px-4 py-3 md:px-8 md:py-4 bg-white rounded-xl min-w-[120px] md:min-w-[180px] h-14 md:h-20 shadow-sm'>
      {partner.logoUrl && !logoError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={partner.logoUrl}
          alt={partner.name}
          className='h-7 md:h-12 w-auto max-w-[80px] md:max-w-[120px] object-contain'
          loading='lazy'
          onError={() => setLogoError(true)}
        />
      ) : (
        <span className='text-copy-black/70 font-semibold text-xs md:text-sm tracking-wide whitespace-nowrap'>
          {partner.name}
        </span>
      )}
    </div>
  )
}

export function LogoMarquee({ partners }: Props) {
  const doubled = [...partners, ...partners]

  // Mobile: RAF + translateX (reliable on iOS; scrollLeft is not)
  const mobileTrackRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(0)
  const dragRef = useRef<{ startX: number; startPos: number } | null>(null)
  const isDragging = useRef(false)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const track = mobileTrackRef.current
    if (!track) return

    const SPEED = 0.6

    const tick = () => {
      if (!isDragging.current) {
        const half = track.scrollWidth / 2
        if (half > 0) {
          posRef.current += SPEED
          if (posRef.current >= half) posRef.current -= half
          track.style.transform = `translateX(-${posRef.current}px)`
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true
    dragRef.current = { startX: e.touches[0].clientX, startPos: posRef.current }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const track = mobileTrackRef.current
    if (!dragRef.current || !track) return
    const half = track.scrollWidth / 2
    if (half <= 0) return
    const delta = dragRef.current.startX - e.touches[0].clientX
    let newPos = dragRef.current.startPos + delta
    newPos = ((newPos % half) + half) % half
    posRef.current = newPos
    track.style.transform = `translateX(-${newPos}px)`
  }

  const onTouchEnd = () => {
    isDragging.current = false
    dragRef.current = null
  }

  return (
    <div className='w-full' aria-hidden='true'>

      {/* Mobile: JS transform marquee + touch drag */}
      <div className='md:hidden overflow-hidden'>
        <div
          ref={mobileTrackRef}
          className='flex gap-3 w-max'
          style={{ willChange: 'transform' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          {doubled.map((partner, i) => (
            <MarqueeItem key={`${partner.id}-${i}`} partner={partner} />
          ))}
        </div>
      </div>

      {/* Desktop: CSS animation marquee */}
      <div className='hidden md:block overflow-hidden'>
        <div className='flex gap-4 animate-marquee w-max'>
          {doubled.map((partner, i) => (
            <MarqueeItem key={`${partner.id}-${i}`} partner={partner} />
          ))}
        </div>
      </div>

    </div>
  )
}
