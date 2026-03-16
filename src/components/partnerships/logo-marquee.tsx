'use client'

import { useState } from 'react'
import type { Partner } from '@/app/partnerships/partners-data'

type Props = {
  partners: Partner[]
}

function MarqueeItem({ partner }: { partner: Partner }) {
  const [logoError, setLogoError] = useState(false)

  return (
    <div className='shrink-0 flex items-center justify-center px-7 py-4 bg-white/5 border border-white/10 rounded-xl min-w-[160px] hover:bg-white/10 hover:border-stride-yellow-accent/30 transition-colors'>
      {partner.logoUrl && !logoError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={partner.logoUrl}
          alt={partner.name}
          className='h-6 w-auto object-contain opacity-60'
          loading='lazy'
          onError={() => setLogoError(true)}
        />
      ) : (
        <span className='text-white/60 font-semibold text-sm tracking-wide whitespace-nowrap'>
          {partner.name}
        </span>
      )}
    </div>
  )
}

export function LogoMarquee({ partners }: Props) {
  // Duplicate the list so the seamless loop works — the animation scrolls -50%
  const doubled = [...partners, ...partners]

  return (
    <div className='overflow-hidden w-full' aria-hidden='true'>
      <div className='flex gap-4 animate-marquee w-max'>
        {doubled.map((partner, i) => (
          <MarqueeItem key={`${partner.id}-${i}`} partner={partner} />
        ))}
      </div>
    </div>
  )
}
