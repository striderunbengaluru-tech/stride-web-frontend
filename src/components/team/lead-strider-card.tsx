'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { InstagramIcon, StravaIcon } from '@/components/ui/brand-icons'
import { striderImageUrls, type LeadStrider } from '@/content/lead-striders'
import { cn } from '@/lib/utils'

/** How long each pose holds before crossfading to the next. */
const CYCLE_MS = 2000

/**
 * Per-card offset applied to the *first* arming of the timer only. Without it
 * every card flips on the same tick, which reads as a page-wide glitch rather
 * than eight portraits breathing.
 */
const STAGGER_MS = 400

/**
 * Circular icon link to one of a strider's profiles.
 *
 * `rounded-full` is a deliberate, requested exception to the house rule that
 * Stride CTAs are always `rounded-md` — that rule is about labelled text
 * buttons, and this is an icon-only social affordance where a circle is the
 * conventional shape. The 44px box is the touch target.
 */
function SocialIconCta({
  href,
  label,
  icon,
  hover,
}: {
  href: string
  label: string
  icon: ReactNode
  hover: string
}) {
  return (
    <Link
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={label}
      className={cn(
        'flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stride-yellow-accent',
        hover
      )}
    >
      {icon}
    </Link>
  )
}

type Props = {
  strider: LeadStrider
  /** Position in the grid — drives the stagger offset. */
  cardIndex: number
  /** Only the first row should preload its portrait. */
  priority?: boolean
  /** Grid-placement overrides from the page, e.g. centring an orphaned card. */
  className?: string
}

/**
 * One Lead Strider: portrait that auto-cycles through their poses, then name,
 * role, bio and social links.
 *
 * `images[0]` (hand-folded + smile) is painted as a static underlay beneath the
 * animated stack, so a pose whose bytes have not arrived yet crossfades over
 * that portrait instead of over an empty box.
 */
export function LeadStriderCard({
  strider,
  cardIndex,
  priority = false,
  className,
}: Props) {
  const poses = striderImageUrls(strider)
  const [pose, setPose] = useState(0)
  const [paused, setPaused] = useState(false)
  // Bumped on a manual pose change so the timer re-arms and the reader gets a
  // full dwell on the pose they picked, not the remainder of the current tick.
  const [manualTick, setManualTick] = useState(0)
  const reduceMotion = useReducedMotion()
  const armedOnce = useRef(false)

  const cycling = poses.length > 1 && !paused && !reduceMotion

  useEffect(() => {
    if (!cycling) return
    let interval: ReturnType<typeof setInterval> | undefined
    const delay = armedOnce.current ? 0 : cardIndex * STAGGER_MS
    const start = setTimeout(() => {
      armedOnce.current = true
      interval = setInterval(
        () => setPose((i) => (i + 1) % poses.length),
        CYCLE_MS
      )
    }, delay)
    return () => {
      clearTimeout(start)
      if (interval) clearInterval(interval)
    }
  }, [cycling, cardIndex, poses.length, manualTick])

  const showPose = (next: number) => {
    setPose(next)
    setManualTick((t) => t + 1)
  }

  // Role is dropped from the alt text while blank — interpolating it raw
  // produced "Kushagra — , Stride Run Club Lead Strider".
  const alt = strider.role
    ? `${strider.name} — ${strider.role}, Stride Run Club Lead Strider`
    : `${strider.name}, Stride Run Club Lead Strider`

  return (
    <article
      id={strider.slug}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'flex scroll-mt-28 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/10 backdrop-blur-md transition-colors hover:border-stride-yellow-accent/50',
        className
      )}
    >
      {/* 3:4 portrait, matching the event-poster ratio used elsewhere. */}
      <div className='relative aspect-3/4 w-full bg-white/5'>
        {/* Resting frame — always present, so it backs every crossfade. */}
        <Image
          src={poses[0]}
          alt={alt}
          fill
          sizes='(min-width: 1024px) 33vw, 50vw'
          priority={priority}
          className='object-cover'
        />

        {poses.length > 1 && (
          <AnimatePresence>
            <motion.div
              key={pose}
              className='absolute inset-0'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
            >
              <Image
                src={poses[pose]}
                alt=''
                aria-hidden='true'
                fill
                sizes='(min-width: 1024px) 33vw, 50vw'
                loading='lazy'
                className='object-cover'
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Pose picker. The bar is 2px of ink inside a 44px touch target. */}
      {poses.length > 1 && (
        <div className='flex justify-center gap-1 px-2'>
          {poses.map((src, i) => (
            <button
              key={src}
              type='button'
              onClick={() => showPose(i)}
              aria-label={`Show photo ${i + 1} of ${poses.length} of ${strider.name}`}
              aria-current={i === pose}
              className='group flex min-h-11 min-w-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stride-yellow-accent'
            >
              <span
                className={`h-0.5 w-6 rounded-full transition-colors ${
                  i === pose
                    ? 'bg-stride-yellow-accent'
                    : 'bg-white/25 group-hover:bg-white/50'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      <div className='flex flex-1 flex-col items-center gap-1.5 px-4 pb-5 text-center sm:px-5'>
        {/* `h2` — the page's `h1` is the heading revealed over the gallery
            above, so `h3` here would skip a level. */}
        <h2 className='font-libre text-xl font-bold leading-tight text-copy-white sm:text-2xl'>
          {strider.name}
        </h2>
        {/* Role and bio are omitted while blank rather than rendered empty —
            an empty element would still take up its line-height and leave a
            ragged gap above the buttons. */}
        {/* The role clamps to two lines, not one: "Founder and Lead Strider" is
            24 tracked uppercase characters and does not fit a 2-up mobile card
            on a single line — clamping to one cut the founder's title. */}
        {strider.role && (
          <p className='font-mono text-[11px] uppercase tracking-[0.18em] text-stride-yellow-accent line-clamp-2'>
            {strider.role}
          </p>
        )}
        {/* Curly quotes live in the markup, not the data, so the JSON stays
            clean prose and the `Person.description` in the page's JSON-LD is not
            wrapped in punctuation. Three lines because a quoted sentence runs
            longer than the role it sits under. */}
        {strider.bio && (
          <p className='mt-0.5 font-figtree text-sm italic leading-relaxed text-white/70 line-clamp-3'>
            &ldquo;{strider.bio}&rdquo;
          </p>
        )}

        {/* Centred under the text block. Strava appears alongside the moment a
            strider has a `stravaUrl`; with only Instagram set, the single icon
            sits centred on its own. */}
        {(strider.instagramUrl || strider.stravaUrl) && (
          <div className='mt-auto flex items-center justify-center gap-2 pt-4'>
            {strider.instagramUrl && (
              <SocialIconCta
                href={strider.instagramUrl}
                label={`${strider.name} on Instagram`}
                icon={<InstagramIcon className='size-4.5' />}
                hover='hover:border-pink-400/60 hover:text-pink-300'
              />
            )}
            {strider.stravaUrl && (
              <SocialIconCta
                href={strider.stravaUrl}
                label={`${strider.name} on Strava`}
                icon={<StravaIcon className='size-4.5' />}
                hover='hover:border-orange-400/60 hover:text-orange-300'
              />
            )}
          </div>
        )}
      </div>
    </article>
  )
}
