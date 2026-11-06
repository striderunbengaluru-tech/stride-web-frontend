'use client'

import { useRef } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import { SLAY_EXPERIENCES, SLAY_EXPERIENCES_HEADLINE } from '@/content/slay'
import { SLAY_LOGOS } from '@/content/slay-photos'
import { gsap, MOTION_OK, useGSAP } from './gsap'
import { SlayArc } from './slay-arc'

/** One surface per slide, so each category reads as its own thing. */
const SLIDE_SURFACES = [
  { surface: 'bg-slay-pink text-copy-black', bolt: SLAY_LOGOS.boltLime },
  { surface: 'bg-slay-lime text-copy-black', bolt: SLAY_LOGOS.boltPink },
  { surface: 'bg-copy-white text-copy-black', bolt: SLAY_LOGOS.boltPink },
] as const

/** Max tilt, either way, as a slide recedes. */
const MAX_TILT_DEG = 5

/**
 * Opens with the section headline riding a curved line (`SlayArc`), then the
 * three experience categories as full-screen slides (Made With GSAP 031,
 * "Scrolling sections"). When a slide reaches the top it pins, then tips back
 * and shrinks into the distance while the next one scrolls up over it. The last
 * slide stays put so its copy can be read. Without motion they are plain
 * stacked panels.
 */
export function SlayExperiences() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const slides = gsap.utils.toArray<HTMLElement>('.slay-slide')
      const mm = gsap.matchMedia()

      mm.add(MOTION_OK, () => {
        slides.slice(0, -1).forEach((slide) => {
          const content = slide.querySelector('.slay-slide-content')
          gsap.timeline({
            scrollTrigger: {
              trigger: slide,
              start: 'top top',
              end: () => `+=${window.innerHeight}`,
              pin: slide.querySelector('.slay-slide-wrapper'),
              pinSpacing: false,
              scrub: true,
              invalidateOnRefresh: true,
            },
          })
            .to(content, {
              rotationZ: gsap.utils.random(-MAX_TILT_DEG, MAX_TILT_DEG),
              rotationX: 40,
              scale: 0.7,
              ease: 'power1.in',
              duration: 1,
            }, 0)
            .to(content, { autoAlpha: 0, ease: 'power1.in', duration: 0.25 }, 0.75)
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id='experiences' aria-labelledby='slay-exp-title' className='scroll-mt-20 bg-slay-ink'>
      {/* The real heading; with motion it is announced but drawn by the arc instead. */}
      <h2 id='slay-exp-title' className='mx-auto max-w-6xl px-4 pb-14 pt-24 font-slay text-5xl uppercase leading-[0.95] motion-safe:sr-only sm:px-8 sm:pt-32 sm:text-7xl'>
        {SLAY_EXPERIENCES_HEADLINE}
      </h2>
      <SlayArc text={SLAY_EXPERIENCES_HEADLINE} />

      <ol>
        {SLAY_EXPERIENCES.map((experience, i) => {
          const { surface, bolt } = SLIDE_SURFACES[i % SLIDE_SURFACES.length]
          return (
            <li key={experience.title} className='slay-slide relative h-svh'>
              <div className='slay-slide-wrapper relative h-full w-full'>
                <article
                  className={clsx(
                    'slay-slide-content absolute inset-0 flex flex-col gap-5 px-5 pb-5 pt-20 shadow-2xl sm:px-10 sm:pb-10 sm:pt-24 lg:justify-between',
                    surface,
                  )}
                >
                  <div className='flex items-start justify-between gap-4'>
                    <h3 className='font-slay text-[clamp(3.25rem,10.5vw,10rem)] uppercase leading-[0.88]'>
                      {experience.title}
                    </h3>
                    <Image src={bolt.src} width={bolt.width} height={bolt.height} alt='' className='w-12 shrink-0 sm:w-20 lg:w-24' />
                  </div>

                  <div className='flex min-h-0 flex-1 flex-col gap-5 lg:flex-none lg:flex-row lg:items-end lg:justify-between'>
                    <div className='relative min-h-0 flex-1 overflow-hidden rounded-2xl lg:order-2 lg:aspect-[16/10] lg:w-[48vw] lg:flex-none'>
                      <Image
                        src={experience.photo.src}
                        alt={experience.photo.alt}
                        fill
                        sizes='(max-width: 1024px) 100vw, 48vw'
                        className='object-cover'
                      />
                    </div>
                    <div className='lg:w-[38vw]'>
                      <p className='text-base leading-relaxed sm:text-xl lg:text-2xl lg:leading-snug'>{experience.description}</p>
                      <div className='mt-4 flex items-center gap-4'>
                        <span aria-hidden className='font-slay text-4xl leading-none opacity-30 sm:text-6xl'>0{i + 1}</span>
                        <ul className='flex flex-wrap gap-2'>
                          {experience.examples.map((example) => (
                            <li key={example} className='rounded-full border-2 border-copy-black px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider'>
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
