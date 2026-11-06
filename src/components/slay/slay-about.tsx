'use client'

import { useRef } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import { SLAY_ABOUT, SLAY_ABOUT_DECOR } from '@/content/slay'
import { SLAY_LOGOS, type SlayPhoto } from '@/content/slay-photos'
import { gsap, MOTION_OK, useGSAP } from './gsap'

/** Gutter stickers: position, tilt and parallax speed, three a side. */
const DECOR_SLOTS = [
  { place: 'top-[6%]', tilt: '-rotate-6', speed: 1.2 },
  { place: 'top-[38%]', tilt: 'rotate-3', speed: 0.6 },
  { place: 'top-[70%]', tilt: '-rotate-3', speed: 1.5 },
] as const

function Sticker({ photo, className }: { photo: SlayPhoto; className?: string }) {
  return (
    <div className={clsx('overflow-hidden rounded-2xl border-4 border-copy-white shadow-2xl', className)}>
      <Image src={photo.src} width={photo.width} height={photo.height} alt='' sizes='220px' className='aspect-[4/5] w-full object-cover' />
    </div>
  )
}

/**
 * The About section: the brief's copy, set large. Photo stickers drift in the
 * gutters on wide screens and sit in a row under the copy on phones.
 */
export function SlayAbout() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(MOTION_OK, () => {
        gsap.utils.toArray<HTMLElement>('.slay-about-sticker').forEach((sticker) => {
          gsap.fromTo(sticker, { y: 0 }, {
            y: -120 * Number(sticker.dataset.speed),
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
          })
        })

        gsap.from('.slay-about-spark', {
          scale: 0,
          rotate: -90,
          stagger: 0.08,
          duration: 0.8,
          ease: 'back.out(2.5)',
          scrollTrigger: { trigger: root.current, start: 'top 70%' },
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} aria-labelledby='slay-about-title' className='relative overflow-hidden bg-slay-ink px-4 pb-20 pt-24 sm:px-8 sm:pb-28 sm:pt-32'>
      {/* Gutter embellishments — wide screens only, where the gutters exist. */}
      <div aria-hidden className='pointer-events-none absolute inset-y-0 left-0 hidden w-[17vw] lg:block'>
        {SLAY_ABOUT_DECOR.left.map((photo, i) => (
          <div key={photo.src} data-speed={DECOR_SLOTS[i].speed} className={clsx('slay-about-sticker absolute left-[2.5vw] w-[12vw] max-w-[220px]', DECOR_SLOTS[i].place)}>
            <Sticker photo={photo} className={DECOR_SLOTS[i].tilt} />
          </div>
        ))}
      </div>
      <div aria-hidden className='pointer-events-none absolute inset-y-0 right-0 hidden w-[17vw] lg:block'>
        {SLAY_ABOUT_DECOR.right.map((photo, i) => (
          <div key={photo.src} data-speed={DECOR_SLOTS[(i + 1) % 3].speed} className={clsx('slay-about-sticker absolute right-[2.5vw] w-[12vw] max-w-[220px]', DECOR_SLOTS[(i + 1) % 3].place)}>
            <Sticker photo={photo} className={DECOR_SLOTS[(i + 2) % 3].tilt} />
          </div>
        ))}
      </div>

      <Image aria-hidden src={SLAY_LOGOS.boltLime.src} width={SLAY_LOGOS.boltLime.width} height={SLAY_LOGOS.boltLime.height} alt='' className='slay-about-spark absolute right-4 top-10 w-10 rotate-12 sm:w-14 lg:right-[15vw] lg:top-14' />
      <Image aria-hidden src={SLAY_LOGOS.boltPink.src} width={SLAY_LOGOS.boltPink.width} height={SLAY_LOGOS.boltPink.height} alt='' className='slay-about-spark absolute bottom-10 left-4 w-9 -rotate-12 sm:w-12 lg:bottom-24 lg:left-[15vw]' />
      <span aria-hidden className='slay-about-spark absolute left-5 top-8 font-slay text-4xl text-slay-pink lg:left-[15.5vw] lg:top-[30%]'>✦</span>
      <span aria-hidden className='slay-about-spark absolute bottom-1/3 right-5 font-slay text-3xl text-slay-lime lg:right-[15.5vw]'>✦</span>
      <span aria-hidden className='slay-about-spark absolute right-[30%] top-6 font-slay text-xl text-copy-white/70'>✦</span>

      <div className='relative mx-auto max-w-3xl lg:max-w-[56vw] xl:max-w-4xl'>
        <h2 id='slay-about-title' className='font-slay text-5xl leading-[0.95] sm:text-7xl'>
          {SLAY_ABOUT.headline}
        </h2>
        {SLAY_ABOUT.paragraphs.map((paragraph, i) => (
          <p
            key={paragraph}
            className={clsx(
              'mt-6 text-[clamp(1.2rem,2.1vw,1.9rem)] leading-snug sm:mt-8',
              i === 1 ? 'font-slay text-slay-lime' : 'text-copy-white/90',
            )}
          >
            {paragraph}
          </p>
        ))}
        <p className='mt-10 font-slay text-4xl text-slay-pink sm:text-6xl'>{SLAY_ABOUT.closing}</p>

        {/* Phones and tablets: the stickers sit under the copy instead. */}
        <div aria-hidden className='mt-12 flex justify-center gap-3 lg:hidden'>
          {[SLAY_ABOUT_DECOR.left[1], SLAY_ABOUT_DECOR.right[0], SLAY_ABOUT_DECOR.left[2]].map((photo, i) => (
            <Sticker key={photo.src} photo={photo} className={clsx('w-1/3 max-w-40', i === 1 ? 'z-10 -translate-y-3 rotate-3' : '-rotate-6')} />
          ))}
        </div>
      </div>
    </section>
  )
}
