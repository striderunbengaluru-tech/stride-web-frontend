'use client'

import { useRef } from 'react'
import { gsap, MOTION_OK, useGSAP } from './gsap'

/** The arc from the original effect, in its 1516-unit-wide drawing. */
const ARC_PATH = 'M0 92.0674C528.5 -28.9327 977.5 -32.4328 1516.5 92.0674'
/**
 * Where along the curve (%) the headline starts. On screen from the first
 * frame, so landing here from the hero's "What we do" link shows words rather
 * than an empty band; the original effect starts fully off-screen right.
 */
const ARC_START = 8
/** Slack on the measured width, so the last letter fully clears the far end. */
const RUN_OUT = 1.1

/**
 * Width of `text` as rendered in `el`'s font, measured on a canvas: glyphs that
 * sit past the end of a textPath aren't rendered, so the SVG can't be asked.
 */
function measureText(text: string, el: Element): number {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return 0
  context.font = window.getComputedStyle(el).font
  return context.measureText(text).width
}

/**
 * A headline that travels along a curved line as you scroll, entering from the
 * right and leaving on the left while the band is pinned (Made With GSAP 032,
 * "Text on a curved path"). Decorative: the caller renders the same words as a
 * real heading, and without motion only that heading shows.
 */
export function SlayArc({ text }: { text: string }) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(MOTION_OK, () => {
        const path = root.current!.querySelector('path')!
        const textPath = root.current!.querySelector('textPath')!

        gsap.fromTo(textPath, { attr: { startOffset: `${ARC_START}%` } }, {
          attr: {
            startOffset: () => `${-(measureText(text, textPath) * RUN_OUT * 100) / path.getTotalLength()}%`,
          },
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            pin: '.slay-arc-stage',
            pinSpacing: false,
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
      })
    },
    { scope: root, dependencies: [text] },
  )

  return (
    <div ref={root} aria-hidden className='slay-arc h-[260svh] motion-reduce:hidden md:h-[320svh]'>
      <div className='slay-arc-stage relative flex h-svh items-center overflow-hidden text-slay-lime'>
        <span className='absolute left-[8%] top-[18%] font-slay text-5xl text-slay-pink'>✦</span>
        <span className='absolute right-[10%] top-[26%] font-slay text-3xl text-copy-white/70'>✦</span>
        <span className='absolute bottom-[20%] right-[22%] font-slay text-6xl text-slay-pink'>✦</span>
        <svg viewBox='0 0 1516 92' fill='none'>
          <path id='slay-arc-path' d={ARC_PATH} stroke='none' />
          <text>
            <textPath href='#slay-arc-path' startOffset={`${ARC_START}%`} textAnchor='start'>
              {text}
            </textPath>
          </text>
        </svg>
      </div>
    </div>
  )
}
