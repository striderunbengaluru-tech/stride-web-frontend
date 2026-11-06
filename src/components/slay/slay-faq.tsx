'use client'

import { useId, useRef, useState } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import { SLAY_FAQ, SLAY_FAQ_HEADLINE } from '@/content/slay'
import { gsap, useGSAP } from './gsap'

/** Open on arrival, so the effect is visible before anyone interacts. */
const INITIAL_OPEN = 0
const EXPAND_S = 0.35

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * FAQ as Made With GSAP 035 ("Smooth thumbnails"): the active row expands to
 * show its answer while three photos rise into it in random order, and the
 * previous row folds shut as its photos drop away three times faster. Rows open
 * on click or keyboard rather than hover, so it works the same on a phone; one
 * row is open at a time and a second click closes it.
 */
export function SlayFaq() {
  const root = useRef<HTMLElement>(null)
  const timelines = useRef<gsap.core.Timeline[]>([])
  const [open, setOpen] = useState(INITIAL_OPEN)
  const baseId = useId()

  useGSAP(
    () => {
      timelines.current = gsap.utils.toArray<HTMLElement>('.slay-faq-row').map((row, i) =>
        gsap.timeline({ paused: i !== INITIAL_OPEN }).fromTo(row.querySelectorAll('.slay-faq-media'), { yPercent: 105 }, {
          yPercent: 0,
          stagger: { each: 0.04, from: 'random' },
          duration: 0.4,
          ease: 'power4.out',
        }),
      )
    },
    { scope: root },
  )

  // A plain click handler: its tweens are short and finish on their own, so they
  // don't need the GSAP context's cleanup.
  function toggle(index: number) {
    const next = index === open ? -1 : index
    const panels = gsap.utils.toArray<HTMLElement>('.slay-faq-panel', root.current)
    const duration = prefersReducedMotion() ? 0 : EXPAND_S

    if (open >= 0) {
      timelines.current[open].timeScale(3).reverse()
      gsap.to(panels[open], { height: 0, duration, ease: 'power2.inOut' })
    }
    if (next >= 0) {
      timelines.current[next].timeScale(1).play()
      gsap.to(panels[next], { height: 'auto', duration, ease: 'power2.inOut' })
    }
    setOpen(next)
  }

  return (
    <section ref={root} aria-labelledby='slay-faq-title' className='bg-slay-ink px-4 py-24 sm:px-8 sm:py-32'>
      <div className='mx-auto max-w-6xl'>
        <h2 id='slay-faq-title' className='mb-12 font-slay text-5xl uppercase leading-[0.95] sm:text-7xl'>
          {SLAY_FAQ_HEADLINE}
        </h2>

        <ul className='border-b border-copy-white/25'>
          {SLAY_FAQ.map(({ question, answer, photos }, i) => {
            const isOpen = open === i
            const buttonId = `${baseId}-q${i}`
            const panelId = `${baseId}-a${i}`
            return (
              <li key={question} className='slay-faq-row border-t border-copy-white/25'>
                <h3>
                  <button
                    id={buttonId}
                    type='button'
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(i)}
                    className={clsx(
                      'flex min-h-16 w-full items-center justify-between gap-6 py-5 text-left text-lg font-semibold transition-colors sm:text-2xl',
                      isOpen ? 'text-slay-lime' : 'text-copy-white hover:text-slay-pink',
                    )}
                  >
                    {question}
                    <span
                      aria-hidden
                      className={clsx(
                        'relative size-10 shrink-0 rounded-full transition-transform duration-300',
                        isOpen ? 'rotate-45 bg-slay-lime' : 'bg-slay-pink',
                      )}
                    >
                      {/* Two drawn bars rather than a "+" glyph, whose font metrics sit it off-centre. */}
                      <span className='absolute left-1/2 top-1/2 h-0.5 w-4 -translate-1/2 rounded-full bg-copy-black' />
                      <span className='absolute left-1/2 top-1/2 h-4 w-0.5 -translate-1/2 rounded-full bg-copy-black' />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role='region'
                  aria-labelledby={buttonId}
                  inert={!isOpen}
                  className={clsx('slay-faq-panel overflow-hidden', i !== INITIAL_OPEN && 'h-0')}
                >
                  <div className='flex flex-col gap-5 pb-7 lg:flex-row lg:items-end lg:justify-between lg:gap-12'>
                    <p className='max-w-2xl text-base leading-relaxed text-copy-white/80 sm:text-lg'>{answer}</p>
                    <span aria-hidden className='flex shrink-0 gap-3 overflow-hidden'>
                      {photos.map((photo) => (
                        <Image
                          key={photo.src}
                          src={photo.src}
                          width={photo.width}
                          height={photo.height}
                          alt=''
                          sizes='112px'
                          className='slay-faq-media size-20 rounded-xl object-cover sm:size-28'
                        />
                      ))}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
