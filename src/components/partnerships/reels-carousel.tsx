'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import clsx from 'clsx'

export type Reel = {
  url: string
  title: string
  thumbnailUrl?: string
  logoUrl?: string
  emoji?: string
  darkChip?: boolean
  partnerHandle?: string
}

type Props = {
  reels: Reel[]
}

export default function ReelsCarousel({ reels }: Props) {
  const [current, setCurrent] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const c = scrollRef.current
    if (!c) return

    const update = () => {
      setCanPrev(c.scrollLeft > 4)
      setCanNext(c.scrollLeft < c.scrollWidth - c.clientWidth - 4)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const slides = Array.from(c.children) as HTMLElement[]
        if (slides.length > 0 && slides[0].offsetWidth > 0) {
          setCurrent(Math.min(Math.round(c.scrollLeft / slides[0].offsetWidth), reels.length - 1))
        }
      }, 100)
    }

    update()
    c.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      c.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [reels.length])

  const scrollTo = (index: number) => {
    const container = scrollRef.current
    if (!container) return
    const slide = container.children[index] as HTMLElement
    if (!slide) return
    setCurrent(index)
    container.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' })
  }

  const prev = () => scrollTo(Math.max(0, current - 1))
  const next = () => scrollTo(Math.min(reels.length - 1, current + 1))

  return (
    <div className='relative'>
      <div
        ref={scrollRef}
        className='flex overflow-x-auto scrollbar-hide snap-x snap-mandatory'
        aria-label='Partnership reels carousel'
      >
        {reels.map((reel) => (
          <div
            key={reel.url}
            className='w-full md:w-1/3 shrink-0 snap-start px-2 md:px-3'
          >
            <a
              href={reel.url}
              target='_blank'
              rel='noopener noreferrer'
              className='group relative h-[420px] rounded-2xl overflow-hidden border border-white/10 hover:border-stride-yellow-accent/40 transition-all duration-300 hover:shadow-2xl hover:shadow-stride-yellow-accent/10 block'
              aria-label={reel.title}
            >
              {/* Yellow top accent strip */}
              <div className='absolute top-0 inset-x-0 h-0.5 bg-stride-yellow-accent z-20' />

              {/* Thumbnail or fallback background */}
              {reel.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={reel.thumbnailUrl}
                  alt={reel.title}
                  className='absolute inset-0 w-full h-full object-cover'
                  loading='lazy'
                />
              ) : (
                <div className={clsx(
                  'absolute inset-0 flex items-center justify-center',
                  reel.darkChip ? 'bg-copy-black' : 'bg-white/5'
                )}>
                  {reel.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={reel.logoUrl}
                      alt=''
                      className={clsx(
                        'h-16 w-auto max-w-[160px] object-contain',
                        !reel.darkChip && 'opacity-15'
                      )}
                      loading='lazy'
                    />
                  ) : reel.emoji ? (
                    <span className='text-6xl leading-none'>{reel.emoji}</span>
                  ) : null}
                </div>
              )}

              {/* Bottom gradient overlay */}
              <div className='absolute inset-x-0 bottom-0 h-[65%] bg-linear-to-t from-black via-black/70 to-transparent pointer-events-none z-10' />

              {/* Bottom content */}
              <div className='absolute inset-x-0 bottom-0 z-20 p-5'>
                {/* Partner logo + handle */}
                <div className='flex items-center gap-2.5 mb-3'>
                  {reel.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={reel.logoUrl}
                      alt=''
                      className='h-6 w-auto max-w-[72px] object-contain brightness-0 invert'
                      loading='lazy'
                    />
                  )}
                  {reel.emoji && !reel.logoUrl && (
                    <span className='text-base leading-none'>{reel.emoji}</span>
                  )}
                  {reel.partnerHandle && (
                    <span className='text-white/75 text-xs font-semibold tracking-wide'>
                      {reel.partnerHandle}
                    </span>
                  )}
                </div>

                {/* Title */}
                <p className='text-white font-bold text-[15px] font-libre leading-snug line-clamp-2 mb-4'>
                  {reel.title}
                </p>

                {/* Watch CTA */}
                <span className='inline-flex items-center gap-1.5 text-[11px] font-bold text-copy-black bg-stride-yellow-accent px-3.5 py-1.5 rounded-md group-hover:bg-white transition-colors duration-200'>
                  <Play size={9} className='fill-current' />
                  Watch on Instagram
                </span>
              </div>
            </a>
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      <div className='flex items-center justify-center gap-3 mt-2'>
        <button
          onClick={prev}
          disabled={!canPrev}
          aria-label='Previous reel'
          className='flex items-center justify-center size-9 rounded-md bg-white/10 border border-white/15 text-copy-white/70 hover:bg-white/20 hover:text-copy-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer'
        >
          <ChevronLeft className='size-4' />
        </button>

        <button
          onClick={next}
          disabled={!canNext}
          aria-label='Next reel'
          className='flex items-center justify-center size-9 rounded-md bg-white/10 border border-white/15 text-copy-white/70 hover:bg-white/20 hover:text-copy-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer'
        >
          <ChevronRight className='size-4' />
        </button>
      </div>
    </div>
  )
}
