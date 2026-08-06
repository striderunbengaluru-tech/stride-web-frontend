'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { UpNextBanner, type UpNextEvent } from './up-next-banner'

/** Time each slide holds before advancing. */
const AUTOPLAY_MS = 4000

type Props = {
  /** Upcoming events, soonest first. */
  events: UpNextEvent[]
  /** Forwarded to the banner — off where the section heading already says "Up next". */
  showLabel?: boolean
  /** Only the events page's first screenful should preload the poster. */
  imagePriority?: boolean
}

/**
 * "Up next" slot, shared by the events hub and the homepage.
 *
 * One event renders as a plain banner — a carousel with nothing to rotate is
 * just chrome. Two or more get autoplay, a progress bar, arrows and a counter,
 * all matching the Press & Media rail (see `FocusRail`) so the two carousels on
 * the homepage read as the same control.
 *
 * Every slide stays mounted in the same grid cell so the container is always
 * as tall as the tallest one: crossfading between differently-sized posters
 * would otherwise shunt the rest of the page up and down on each tick.
 * Off-screen slides are `inert`, which keeps their links out of the tab order
 * and away from the pointer.
 */
export function UpNextCarousel({ events, showLabel = true, imagePriority = false }: Props) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduceMotion = useReducedMotion()

  const count = events.length
  // Autoplay is motion the reader didn't ask for, so it's off when the OS says
  // "reduce motion". The arrows still work.
  const autoplay = count > 1 && !paused && !reduceMotion

  const go = useCallback((delta: number) => {
    setIndex(i => (i + delta + count) % count)
  }, [count])

  // `index` is a dependency on purpose: it re-arms the timer whenever the
  // reader navigates by hand, so an arrow click gets a full dwell instead of
  // inheriting whatever was left of the previous one.
  useEffect(() => {
    if (!autoplay) return
    const id = setInterval(() => go(1), AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [autoplay, go, index])

  // Progress bar, driven the same way FocusRail drives its own: restarted from
  // zero on every slide change and paused with the timer.
  const progressValue = useMotionValue(0)
  const progressWidth = useTransform(progressValue, v => `${v}%`)

  useEffect(() => {
    progressValue.set(0)
    if (!autoplay) return
    const controls = animate(progressValue, 100, { duration: AUTOPLAY_MS / 1000, ease: 'linear' })
    return () => controls.stop()
  }, [index, autoplay, progressValue])

  if (count === 0) return null
  if (count === 1) {
    return <UpNextBanner event={events[0]} showLabel={showLabel} imagePriority={imagePriority} />
  }

  return (
    <div
      role='group'
      aria-roledescription='carousel'
      aria-label='Upcoming events'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className='grid'>
        {events.map((event, i) => {
          const active = i === index
          return (
            <motion.div
              key={event.slug}
              className='col-start-1 row-start-1'
              animate={{ opacity: active ? 1 : 0 }}
              initial={false}
              transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
              inert={!active}
              aria-hidden={!active}
              aria-roledescription='slide'
              aria-label={`${i + 1} of ${count}`}
            >
              <UpNextBanner event={event} showLabel={showLabel} imagePriority={imagePriority && i === 0} />
            </motion.div>
          )
        })}
      </div>

      {/* Progress — sits directly below the card */}
      <div className='mt-4 md:mt-6 w-full h-0.5 rounded-full bg-white/10 overflow-hidden'>
        <motion.div style={{ width: progressWidth }} className='h-full bg-stride-yellow-accent rounded-full' />
      </div>

      {/* Controls + counter — same treatment as the Press & Media rail */}
      <div className='mt-4 md:mt-6 flex items-center gap-3 flex-wrap'>
        <button
          type='button'
          onClick={() => go(-1)}
          className='flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 border border-white/15 text-copy-white/60 hover:text-copy-white hover:border-stride-yellow-accent/40 hover:bg-white/15 transition-all active:scale-90 cursor-pointer'
          aria-label='Previous event'
        >
          <ArrowLeft className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={() => go(1)}
          className='flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 border border-white/15 text-copy-white/60 hover:text-copy-white hover:border-stride-yellow-accent/40 hover:bg-white/15 transition-all active:scale-90 cursor-pointer'
          aria-label='Next event'
        >
          <ArrowRight className='h-4 w-4' />
        </button>

        {/* Slide counter */}
        <span className='font-mono text-sm text-copy-white/70 tabular-nums select-none'>
          {index + 1}/{count}
        </span>
      </div>
    </div>
  )
}
