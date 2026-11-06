'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { SLAY_MARQUEE_ROWS } from '@/content/slay'
import { gsap, MOTION_OK, useGSAP } from './gsap'

/**
 * Three photo ribbons wider than the screen, pinned while they glide sideways
 * (Made With GSAP 065, "Triple marquee parallax"). The middle row runs the
 * other way. Reduced motion: the band is not pinned and each row scrolls by hand.
 */
export function SlayMarquee() {
  const pinHeight = useRef<HTMLDivElement>(null)
  const container = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const rows = gsap.utils.toArray<HTMLElement>('.slay-marquee-row')
      const mm = gsap.matchMedia()

      mm.add(MOTION_OK, () => {
        // Measured, not pre-computed: every <img> carries its width and height,
        // so layout is known before the bytes arrive, and invalidateOnRefresh
        // re-measures on resize.
        const distance = (row: HTMLElement) => row.scrollWidth - window.innerWidth

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pinHeight.current,
            start: 'top top',
            end: 'bottom bottom',
            pin: container.current,
            pinSpacing: false,
            scrub: true,
            invalidateOnRefresh: true,
          },
        })

        rows.forEach((row, i) => {
          const reverse = i % 2 === 1
          tl.fromTo(
            row,
            { x: () => (reverse ? -distance(row) : 0) },
            { x: () => (reverse ? 0 : -distance(row)), ease: 'none', duration: 1 },
            0,
          )
        })
      })
    },
    { scope: pinHeight },
  )

  return (
    <section aria-labelledby='slay-marquee-title' className='bg-slay-ink'>
      <div ref={pinHeight} className='motion-safe:h-[320svh]'>
        <div ref={container} className='relative flex flex-col justify-center gap-2 overflow-hidden py-16 motion-safe:h-svh motion-safe:py-0'>
          <h2
            id='slay-marquee-title'
            className='pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-2 px-4 text-center font-slay text-[clamp(2.75rem,11vw,8rem)] uppercase leading-none motion-reduce:static motion-reduce:mb-6 motion-reduce:translate-y-0'
          >
            <span className='-rotate-3 bg-slay-lime px-4 pt-1 text-copy-black shadow-2xl'>Show up</span>
            <span className='rotate-2 bg-slay-pink px-4 pt-1 text-copy-black shadow-2xl'>for yourself</span>
          </h2>
          {SLAY_MARQUEE_ROWS.map((row, i) => (
            <div
              key={i}
              className='slay-marquee-row flex h-[30svh] w-max gap-2 px-2 motion-reduce:h-56 motion-reduce:w-full motion-reduce:overflow-x-auto'
            >
              {row.map((photo) => (
                <Image
                  key={photo.src}
                  src={photo.src}
                  width={photo.width}
                  height={photo.height}
                  alt={photo.alt}
                  sizes='(max-width: 768px) 60vw, 30vw'
                  className='h-full w-auto shrink-0 rounded-xl object-cover'
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
