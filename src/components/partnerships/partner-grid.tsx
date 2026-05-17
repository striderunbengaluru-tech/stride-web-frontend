'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { PartnerCategory } from '@/app/partnerships/partners-data'
import { WHATSAPP_LINK } from '@/app/partnerships/partners-data'

type Props = {
  categories: PartnerCategory[]
}

export default function PartnerGrid({ categories }: Props) {
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const allPartners = categories.flatMap((c) =>
    c.partners.map((p) => ({ ...p, categoryId: c.id }))
  )

  const filtered =
    activeFilter === 'all'
      ? allPartners
      : allPartners.filter((p) => p.categoryId === activeFilter)

  const showMore = activeFilter === 'all' || activeFilter === 'others'

  return (
    <div>
      {/* Pills */}
      <div className='flex flex-wrap gap-2 justify-center mb-10'>
        <button
          onClick={() => setActiveFilter('all')}
          className={clsx(
            'px-4 py-1.5 rounded-full text-sm transition-colors cursor-pointer',
            activeFilter === 'all'
              ? 'bg-stride-yellow-accent text-copy-black font-semibold'
              : 'bg-white/10 border border-white/15 text-white/70 hover:border-white/40'
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveFilter(c.id)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm transition-colors cursor-pointer',
              activeFilter === c.id
                ? 'bg-stride-yellow-accent text-copy-black font-semibold'
                : 'bg-white/10 border border-white/15 text-white/70 hover:border-white/40'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid — 2 col mobile, 3 col sm, 4 col md+ */}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5'>
        {filtered.map((partner) => (
          <div
            key={partner.id}
            className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4 flex flex-col items-center text-center hover:border-stride-yellow-accent/40 hover:bg-white/15 transition-colors group'
          >
            <div className='w-full h-16 bg-white rounded-lg flex items-center justify-center mb-3 px-4 py-2'>
              {partner.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={partner.logoUrl}
                  alt={partner.name}
                  className='max-h-full w-auto max-w-full object-contain'
                  loading='lazy'
                />
              ) : (
                <span className='text-stride-purple-primary font-bold text-xl'>
                  {partner.name.charAt(0)}
                </span>
              )}
            </div>
            <p className='text-white/80 font-semibold text-xs leading-tight line-clamp-2'>
              {partner.name}
            </p>
          </div>
        ))}

        {/* +20 more card */}
        {showMore && (
          <div className='bg-white/5 border border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center text-center'>
            <div className='w-full h-16 flex items-center justify-center mb-3'>
              <p className='text-stride-yellow-accent/60 font-bold text-3xl leading-none'>+20</p>
            </div>
            <p className='text-white/30 text-xs'>more brands</p>
          </div>
        )}

        {/* + Your Brand — links to WhatsApp */}
        <a
          href={WHATSAPP_LINK}
          target='_blank'
          rel='noopener noreferrer'
          className='border border-dashed border-stride-yellow-accent/30 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-stride-yellow-accent/70 hover:bg-stride-yellow-accent/5 transition-colors group'
        >
          <div className='w-full h-16 flex items-center justify-center mb-3'>
            <span className='text-stride-yellow-accent/50 text-3xl group-hover:text-stride-yellow-accent transition-colors leading-none'>
              +
            </span>
          </div>
          <p className='text-stride-yellow-accent/50 font-semibold text-xs group-hover:text-stride-yellow-accent transition-colors'>
            Your Brand
          </p>
          <p className='text-white/25 text-[10px] mt-0.5 group-hover:text-white/40 transition-colors'>
            Join us
          </p>
        </a>
      </div>
    </div>
  )
}
