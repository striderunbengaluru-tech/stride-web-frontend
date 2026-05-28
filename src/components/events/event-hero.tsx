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

  // Auto-advance every 4 seconds when multiple images
  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % images.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [images.length])

  const src = images[current]

  return (
    <div className='relative w-full h-72 sm:h-96 overflow-hidden bg-linear-to-br from-stride-purple-primary to-stride-yellow-accent/20'>
      <AnimatePresence mode='sync'>
        <motion.div
          key={src}
          className='absolute inset-0'
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <Image
            src={src}
            alt={eventName}
            fill
            className='object-cover'
            priority
            sizes='100vw'
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className='absolute inset-0 bg-linear-to-t from-stride-purple-primary/90 via-black/20 to-transparent' />
      <div className='absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-transparent' />

      {/* Price badge — top-right */}
      <div className='absolute top-4 right-4 z-10'>
        {pricePaise === 0 ? (
          <span className='bg-green-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full'>
            Free Event
          </span>
        ) : (
          <span className='bg-black/50 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm'>
            ₹{(pricePaise / 100).toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {/* Carousel controls */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent(prev => (prev - 1 + images.length) % images.length)}
            className='absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors'
            aria-label='Previous image'
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrent(prev => (prev + 1) % images.length)}
            className='absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors'
            aria-label='Next image'
          >
            <ChevronRight size={16} />
          </button>

          {/* Dot indicators */}
          <div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5'>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === current ? 'w-6 bg-stride-yellow-accent' : 'w-1.5 bg-white/40'
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
