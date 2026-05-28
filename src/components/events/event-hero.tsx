'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  images: string[]
  eventName: string
  pricePaise: number
}

export function EventHero({ images, eventName, pricePaise }: Props) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % images.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [images.length])

  const src = images[current]

  return (
    // Portrait on mobile (3:4), cinematic on desktop (16:7)
    <div className='relative w-full overflow-hidden bg-stride-purple-primary aspect-3/4 max-h-[88vw] sm:aspect-16/7 sm:max-h-[520px]'>
      <AnimatePresence mode='sync'>
        <motion.div
          key={src}
          className='absolute inset-0'
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <Image
            src={src}
            alt={eventName}
            fill
            className='object-cover object-center'
            priority
            sizes='100vw'
          />
        </motion.div>
      </AnimatePresence>

      {/* Top vignette for price badge legibility */}
      <div className='absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-transparent' />

      {/* Price badge */}
      <div className='absolute top-4 right-4 z-10'>
        {pricePaise === 0 ? (
          <span className='bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full'>
            Free
          </span>
        ) : (
          <span className='bg-black/50 backdrop-blur-sm border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full'>
            ₹{(pricePaise / 100).toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {/* Prev / next — desktop only */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent(prev => (prev - 1 + images.length) % images.length)}
            className='hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center text-white/80 hover:bg-black/60 transition-colors'
            aria-label='Previous image'
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrent(prev => (prev + 1) % images.length)}
            className='hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center text-white/80 hover:bg-black/60 transition-colors'
            aria-label='Next image'
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Pagination dots — always shown when multiple images */}
      {images.length > 1 && (
        <div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5'>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-5 h-1.5 bg-stride-yellow-accent' : 'w-1.5 h-1.5 bg-white/50'
              }`}
              aria-label={`Image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
