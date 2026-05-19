'use client'

import { useState } from 'react'
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
