'use client'

import { useRef } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import { SLAY_HERO_PHOTOS, SLAY_INTRO } from '@/content/slay'
import { SLAY_LOGOS } from '@/content/slay-photos'
import { gsap, MOTION_OK, SplitText, useGSAP } from './gsap'

/** Seconds each photo holds before the next fades over it. */
const HOLD_S = 4
const FADE_S = 1.2
/**
 * Past this, the page has been on screen long enough that the title is already
 * read — replaying the entrance would look like a glitch. Mirrors the
 * LATE_HYDRATION_MS guard in SectionReveal.
 */
const LATE_HYDRATION_MS = 1200

export function SlayHero() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const slides = gsap.utils.toArray<HTMLElement>('.slay-hero-slide')
      const mm = gsap.matchMedia()

      mm.add(MOTION_OK, () => {
        // Each new slide fades in on top of the last, with a slow push-in. A
        // rising z-index rather than a repeating timeline, so the wrap from the
        // last photo back to the first is as smooth as every other cut.
        let index = 0
        const pushIn = (slide: HTMLElement) =>
          gsap.fromTo(slide, { scale: 1.14 }, { scale: 1, duration: HOLD_S + FADE_S * 2, ease: 'none' })
        const advance = () => {
          index += 1
          const slide = slides[index % slides.length]
          gsap.set(slide, { zIndex: index + 1 })
          gsap.fromTo(slide, { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE_S, ease: 'power2.out' })
          pushIn(slide)
        }
        // The first photo is the LCP image and is already on screen — no fade.
        pushIn(slides[0])
        // One empty tween as the clock: it lives in this context, so leaving the
        // page (or switching to reduced motion) stops the slideshow.
        gsap.to({}, { duration: HOLD_S, repeat: -1, onRepeat: advance })

        if (performance.now() > LATE_HYDRATION_MS) return

        const split = SplitText.create('.slay-hero-title', { type: 'lines,chars', mask: 'lines' })
        gsap.timeline({ defaults: { ease: 'expo.out' } })
          .from(split.chars, { yPercent: 115, rotate: 8, duration: 1.1, stagger: 0.035 })
          .from('.slay-hero-fade', { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.1 }, '-=0.7')
          .from('.slay-hero-bolt', { scale: 0, rotate: -40, duration: 1, ease: 'back.out(2)' }, '-=0.8')
      })

    },
    { scope: root },
  )

  return (
    <section ref={root} id='top' className='relative isolate flex min-h-svh flex-col justify-end overflow-hidden pb-14 pt-28 sm:pb-20'>
      <div className='absolute inset-0 -z-10'>
        {/* Own stacking context, so the ever-rising slide z-index never climbs over the scrim. */}
        <div className='absolute inset-0 isolate'>
          {SLAY_HERO_PHOTOS.map((photo, i) => (
            <Image
              key={photo.src}
              src={photo.src}
              alt={i === 0 ? photo.alt : ''}
              fill
              priority={i === 0}
              sizes='100vw'
              className={clsx('slay-hero-slide object-cover', i > 0 && 'invisible opacity-0')}
            />
          ))}
        </div>
        <div className='absolute inset-0 bg-linear-to-t from-slay-ink via-slay-ink/45 to-slay-ink/30' />
      </div>

      <Image
        src={SLAY_LOGOS.boltPink.src}
        width={SLAY_LOGOS.boltPink.width}
        height={SLAY_LOGOS.boltPink.height}
        alt=''
        className='slay-hero-bolt absolute right-4 top-24 w-16 rotate-12 drop-shadow-xl sm:right-12 sm:top-28 sm:w-28'
      />

      <div className='mx-auto w-full max-w-7xl px-4 sm:px-8'>
        <h1 className='slay-hero-title font-slay text-[clamp(4.5rem,21vw,15rem)] uppercase leading-[0.86] tracking-tight'>
          Slay <span className='text-slay-lime'>every</span>
          <br />
          move.
        </h1>
        <p className='slay-hero-fade mt-6 max-w-xl text-lg leading-relaxed text-copy-white/90 sm:text-xl'>
          {SLAY_INTRO}
        </p>
        <div className='slay-hero-fade mt-8 flex flex-col gap-3 sm:flex-row'>
          <a
            href='#join'
            className='inline-flex min-h-14 items-center justify-center rounded-full bg-slay-lime px-8 font-slay text-xl uppercase tracking-wide text-copy-black transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slay-lime'
          >
            Join now
          </a>
          <a
            href='#experiences'
            className='inline-flex min-h-14 items-center justify-center rounded-full border-2 border-copy-white/70 px-8 font-slay text-xl uppercase tracking-wide transition-colors hover:border-slay-pink hover:bg-slay-pink hover:text-copy-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slay-lime'
          >
            What we do
          </a>
        </div>
      </div>
    </section>
  )
}
