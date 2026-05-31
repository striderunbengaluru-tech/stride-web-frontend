'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  images: string[]
  eventName: string
}

export function EventHero({ images, eventName }: Props) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % images.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [images.length])

  const src = images[current]

  return (
    // Mobile: portrait 3:4 | Tablet: 16:7 cinematic | Desktop: square in left column
    // Transparent bg lets the page's ambient orbs bleed through the letterbox
    // bars of object-contain — no visible rectangular edge around the image.
    <div className='relative w-full overflow-hidden rounded-md aspect-3/4 max-h-[88vw] sm:aspect-16/7 sm:max-h-none lg:aspect-square lg:max-h-none'>
      <AnimatePresence mode='sync'>
        <motion.div
          key={src}
          className='absolute inset-0'
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <Image
            src={src}
            alt={eventName}
            fill
            className='object-contain'
            priority
            sizes='(max-width: 1024px) 100vw, 44vw'
          />
        </motion.div>
      </AnimatePresence>

      {/* Prev / next buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent(prev => (prev - 1 + images.length) % images.length)}
            className='absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors'
            aria-label='Previous image'
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrent(prev => (prev + 1) % images.length)}
            className='absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors'
            aria-label='Next image'
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Pagination dots */}
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
