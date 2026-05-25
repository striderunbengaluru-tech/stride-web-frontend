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
  const scrollRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | undefined>(undefined)
  const isPausedRef = useRef(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const SPEED = 0.6 // px per frame at 60 fps ≈ 36 px/s

    const tick = () => {
      if (!isPausedRef.current) {
        el.scrollLeft += SPEED
        // Seamless loop: once we've scrolled the first copy, jump back to start
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className='w-full' aria-hidden='true'>

      {/* Mobile: JS-driven auto-glide + manual swipe on touch */}
      <div
        ref={scrollRef}
        className='md:hidden overflow-x-auto [&::-webkit-scrollbar]:hidden'
        style={{ scrollbarWidth: 'none' } as React.CSSProperties}
        onTouchStart={() => { isPausedRef.current = true }}
        onTouchEnd={() => { isPausedRef.current = false }}
      >
        <div className='flex gap-3 px-1 w-max'>
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
