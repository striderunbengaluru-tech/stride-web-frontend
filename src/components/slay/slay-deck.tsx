'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { SLAY_FAN } from '@/content/slay'
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from './gsap'

/** Depth between neighbouring cards in the deck, in px along y and z. */
const DECK_GAP = 30
/** Max tilt, either way, as a card is thrown off the top. */
const THROW_TILT_DEG = 25

/**
 * The camera roll as a pinned deck (Made With GSAP 042, "Card deck"): the cards
 * sit stacked in depth, and as you scroll the top one is flung up and away while
 * the rest of the deck steps forward. Without motion the cards are a plain
 * scrollable row.
 *
 * The top of a stack is the last element in the DOM, so the cards render in
 * reverse — the first card in SLAY_FAN is the first one thrown.
 */
export function SlayDeck() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(MOTION_OK, () => {
        const pin = root.current!.querySelector<HTMLElement>('.slay-deck-pin')!
        const cards = gsap.utils.toArray<HTMLElement>('.slay-deck-card')
        const count = cards.length

        ScrollTrigger.create({
          trigger: pin,
          start: 'top top',
          end: 'bottom bottom',
          pin: '.slay-deck-stage',
          pinSpacing: false,
        })

        const perCard = (pin.clientHeight - window.innerHeight) / count
        gsap.set(cards, { y: DECK_GAP * (count - 1), z: -DECK_GAP * (count - 1) })

        // Each card's timeline is offset by its place in the deck: it steps
        // forward once for every card thrown before it, then is thrown itself.
        cards.forEach((card, index) => {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: pin,
              start: `top top+=${perCard * index}`,
              end: `bottom bottom+=${perCard * index}`,
              scrub: 0.5,
            },
          })
          for (let i = 0; i < count - 1; i++) {
            tl.to(card, { y: `-=${DECK_GAP}`, z: `+=${DECK_GAP}`, ease: 'back.inOut(3)' })
          }
          tl.to(card, {
            yPercent: -80,
            y: '-50vh',
            scale: 1.2,
            rotation: gsap.utils.random(-THROW_TILT_DEG, THROW_TILT_DEG),
            ease: 'power4.in',
          })
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} aria-labelledby='slay-deck-title' className='bg-slay-pink text-copy-black'>
      <div className='slay-deck-pin motion-safe:h-[600svh]'>
        <div className='slay-deck-stage relative flex flex-col items-center justify-center gap-10 overflow-hidden py-20 motion-safe:h-svh motion-safe:py-0'>
          {/* Phones: the title sits above the deck. Wide screens: it flanks it. */}
          <h2
            id='slay-deck-title'
            className='z-10 px-4 text-center font-slay text-[clamp(2.75rem,8vw,6rem)] uppercase leading-[0.9] lg:text-[4.8vw] motion-safe:absolute motion-safe:top-20 lg:pointer-events-none lg:flex lg:w-full lg:justify-between lg:px-10 lg:text-left motion-safe:lg:top-1/2 motion-safe:lg:-translate-y-1/2'
          >
            <span className='block'>Every move,</span>
            <span className='block text-copy-white lg:text-right'>every memory</span>
          </h2>

          <ul className='slay-deck flex w-full gap-4 overflow-x-auto px-4 motion-safe:mt-24 motion-safe:overflow-visible motion-safe:px-0 lg:motion-safe:mt-0'>
            {[...SLAY_FAN].reverse().map(({ photo, caption, place }) => (
              <li key={photo.src} className='slay-deck-card shrink-0'>
                <figure className='relative h-full w-56 overflow-hidden rounded-3xl border-4 border-copy-white shadow-2xl motion-safe:w-full'>
                  <Image
                    src={photo.src}
                    width={photo.width}
                    height={photo.height}
                    alt={photo.alt}
                    sizes='(max-width: 768px) 62vw, 24vw'
                    className='aspect-[3/4] h-full w-full object-cover'
                  />
                  <figcaption className='absolute inset-x-3 bottom-3 rounded-2xl bg-slay-lime px-3 py-2 text-center text-copy-black'>
                    <span className='block font-slay text-xl uppercase leading-none'>{caption}</span>
                    <span className='font-mono text-[10px] font-semibold uppercase tracking-widest'>{place}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
