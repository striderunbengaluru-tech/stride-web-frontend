'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import InstagramEmbed from './instagram-embed'
import clsx from 'clsx'

type Props = {
  urls: string[]
}

export default function ReelsCarousel({ urls }: Props) {
  const [current, setCurrent] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Track scroll position to update button disabled state
  useEffect(() => {
    const c = scrollRef.current
    if (!c) return
    const update = () => {
      setCanPrev(c.scrollLeft > 4)
      setCanNext(c.scrollLeft < c.scrollWidth - c.clientWidth - 4)
    }
    update()
    c.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      c.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const scrollTo = (index: number) => {
    const container = scrollRef.current
    if (!container) return
    const slide = container.children[index] as HTMLElement
    if (!slide) return
    container.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' })
    setCurrent(index)
  }

  const prev = () => scrollTo(Math.max(0, current - 1))
  const next = () => scrollTo(Math.min(urls.length - 1, current + 1))

  return (
    <div className='relative'>
      {/* Slides — 1 visible on mobile, 3 on md+ */}
      <div
        ref={scrollRef}
        className='flex overflow-x-hidden'
        aria-label='Instagram reels carousel'
      >
        {urls.map((url, i) => (
          <div
            key={url}
            // Each slide: full-width on mobile, 1/3 on desktop
            className='w-full md:w-1/3 shrink-0 px-2 md:px-3'
          >
            <InstagramEmbed url={url} />
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className='flex items-center justify-center gap-4 mt-8'>
        <button
          onClick={prev}
          disabled={!canPrev}
          aria-label='Previous reel'
          className='flex items-center justify-center size-10 rounded-full bg-white/10 border border-white/15 text-copy-white/70 hover:bg-white/20 hover:text-copy-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150'
        >
          <ChevronLeft className='size-5' />
        </button>

        {/* Dots */}
        <div className='flex items-center gap-2'>
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Go to reel ${i + 1}`}
              className={clsx(
                'rounded-full transition-all duration-200',
                i === current
                  ? 'w-5 h-2 bg-stride-yellow-accent'
                  : 'w-2 h-2 bg-white/25 hover:bg-white/50'
              )}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={!canNext}
          aria-label='Next reel'
          className='flex items-center justify-center size-10 rounded-full bg-white/10 border border-white/15 text-copy-white/70 hover:bg-white/20 hover:text-copy-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150'
        >
          <ChevronRight className='size-5' />
        </button>
      </div>
    </div>
  )
}
