'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'

type Props = {
  images: string[]
  eventName: string
}

// Horizontal swipe distance (px) that counts as a next/prev gesture in the lightbox
const SWIPE_THRESHOLD_PX = 80

export function EventHero({ images, eventName }: Props) {
  const [current, setCurrent] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  // Guards createPortal until the client has mounted
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const prev = useCallback(
    () => setCurrent(p => (p - 1 + images.length) % images.length),
    [images.length]
  )
  const next = useCallback(
    () => setCurrent(p => (p + 1) % images.length),
    [images.length]
  )

  // Autoplay — paused while the lightbox is open so the photo being viewed
  // doesn't advance underneath the visitor.
  useEffect(() => {
    if (images.length <= 1 || lightboxOpen) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [images.length, lightboxOpen, next])

  // Lightbox: lock body scroll, close on Escape, navigate with arrow keys
  useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [lightboxOpen, prev, next])

  const src = images[current]

  return (
    // Posters are 3:4 everywhere (admin crops to 3:4), shown edge-to-edge with
    // object-cover — full-bleed on mobile and in the desktop left column.
    <div className='relative w-full overflow-hidden rounded-md aspect-3/4'>
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
            className='object-cover'
            priority
            sizes='(max-width: 1024px) 100vw, 44vw'
          />
        </motion.div>
      </AnimatePresence>

      {/* Fullscreen carousel trigger — top right corner */}
      <button
        onClick={() => setLightboxOpen(true)}
        className='absolute right-3 top-3 z-10 min-w-11 min-h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors'
        aria-label='View photos in fullscreen'
      >
        <Maximize2 size={16} />
      </button>

      {/* Prev / next buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className='absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors'
            aria-label='Previous image'
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            className='absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors'
            aria-label='Next image'
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Pagination dots — visual dot inside a ≥24px hit area */}
      {images.length > 1 && (
        <div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5'>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className='flex items-center justify-center min-w-6 min-h-6'
              aria-label={`Image ${i + 1}`}
            >
              <span
                className={`rounded-full transition-all duration-300 ${
                  i === current ? 'w-5 h-1.5 bg-stride-yellow-accent' : 'w-1.5 h-1.5 bg-white/50'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Fullscreen lightbox carousel ── */}
      {mounted && lightboxOpen && createPortal(
        <div
          role='dialog'
          aria-modal='true'
          aria-label={`${eventName} photos`}
          className='fixed inset-0 z-100 bg-stride-purple-primary/80 backdrop-blur-xl flex flex-col'
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxOpen(false) }}
        >
          {/* Top bar — counter + close */}
          <div className='flex items-center justify-between px-4 pt-4 sm:px-6 sm:pt-5 shrink-0'>
            <p className='text-white/60 text-sm font-mono tabular-nums'>
              {current + 1} / {images.length}
            </p>
            <button
              onClick={() => setLightboxOpen(false)}
              className='min-w-11 min-h-11 rounded-full bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center text-white/80 hover:border-stride-yellow-accent/50 transition-colors'
              aria-label='Close fullscreen photos'
            >
              <X size={18} />
            </button>
          </div>

          {/* Photo — swipeable on touch, fades between slides */}
          <div
            className='relative flex-1 min-h-0 mx-4 my-4 sm:mx-16'
            onClick={(e) => { if (e.target === e.currentTarget) setLightboxOpen(false) }}
          >
            <AnimatePresence mode='sync'>
              <motion.div
                key={src}
                className='absolute inset-0'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                drag={images.length > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -SWIPE_THRESHOLD_PX) next()
                  else if (info.offset.x > SWIPE_THRESHOLD_PX) prev()
                }}
              >
                <Image
                  src={src}
                  alt={`${eventName} — photo ${current + 1} of ${images.length}`}
                  fill
                  className='object-contain select-none pointer-events-none'
                  sizes='100vw'
                />
              </motion.div>
            </AnimatePresence>

            {/* Prev / next — overlaid at the photo edges on mobile, floated
                outside it on desktop */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className='flex absolute left-1 sm:-left-13 top-1/2 -translate-y-1/2 z-10 min-w-11 min-h-11 rounded-full bg-white/10 border border-white/15 backdrop-blur-md items-center justify-center text-white/80 hover:border-stride-yellow-accent/50 transition-colors'
                  aria-label='Previous image'
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={next}
                  className='flex absolute right-1 sm:-right-13 top-1/2 -translate-y-1/2 z-10 min-w-11 min-h-11 rounded-full bg-white/10 border border-white/15 backdrop-blur-md items-center justify-center text-white/80 hover:border-stride-yellow-accent/50 transition-colors'
                  aria-label='Next image'
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {/* Dots — visual dot inside a 44px-tall hit area */}
          {images.length > 1 && (
            <div className='flex items-center justify-center pb-4 shrink-0'>
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className='flex items-center justify-center min-w-6 min-h-11'
                  aria-label={`Image ${i + 1}`}
                >
                  <span
                    className={`rounded-full transition-all duration-300 ${
                      i === current ? 'w-5 h-1.5 bg-stride-yellow-accent' : 'w-1.5 h-1.5 bg-white/50'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
