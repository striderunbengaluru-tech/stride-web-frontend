'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import { InstagramIcon, StravaIcon } from '@/components/ui/brand-icons'
import { SLAY_TEAM, type SlayTeamMember } from '@/content/slay'

/**
 * Lilac rather than Slay pink for the first card: Ichita's card carries the
 * Strava button, and Strava orange on pink has no contrast between them.
 */
const CARD_SURFACES = ['bg-violet-200', 'bg-slay-lime', 'bg-copy-white'] as const

/** How long each pose holds, and the per-card offset so the three don't flip together. Same as /team. */
const CYCLE_MS = 2000
const STAGGER_MS = 400

/**
 * The portrait, cycling through the person's poses from the Stride team page.
 * Every pose stays mounted so each image loads once. The incoming pose fades in
 * over the outgoing one, which stays opaque underneath — a symmetric crossfade
 * would dip both and flash the card colour through. Pauses on hover or focus,
 * and holds the first pose for reduced-motion visitors.
 */
function Portrait({ member, index }: { member: SlayTeamMember; index: number }) {
  const [frame, setFrame] = useState<{ current: number; previous: number | null }>({ current: 0, previous: null })
  const [paused, setPaused] = useState(false)
  const poses = member.imageUrls

  useEffect(() => {
    if (poses.length < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let interval: ReturnType<typeof setInterval> | undefined
    const start = setTimeout(() => {
      interval = setInterval(
        () => setFrame((f) => ({ current: (f.current + 1) % poses.length, previous: f.current })),
        CYCLE_MS,
      )
    }, index * STAGGER_MS)
    return () => {
      clearTimeout(start)
      if (interval) clearInterval(interval)
    }
  }, [paused, index, poses.length])

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className='relative aspect-[3/4] bg-copy-black/10'
    >
      {poses.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === 0 ? `Portrait of ${member.name}` : ''}
          aria-hidden={i === 0 ? undefined : true}
          fill
          sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
          className={clsx(
            'object-cover',
            i === frame.current && 'z-20 opacity-100 transition-opacity duration-700 ease-in-out',
            i === frame.previous && 'z-10 opacity-100',
            i !== frame.current && i !== frame.previous && 'z-0 opacity-0',
          )}
        />
      ))}
    </div>
  )
}
const SOCIAL_LINK =
  'flex size-11 items-center justify-center rounded-full text-copy-white transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copy-black'

export function SlayTeam() {
  return (
    <section aria-labelledby='slay-team-title' className='bg-slay-ink px-4 py-24 sm:px-8 sm:py-32'>
      <div className='mx-auto max-w-6xl'>
        <h2 id='slay-team-title' className='font-slay text-5xl uppercase leading-[0.95] sm:text-7xl'>
          The people behind <span className='text-slay-pink'>the movement.</span>
        </h2>

        <ul className='mt-14 grid gap-8 md:grid-cols-3'>
          {SLAY_TEAM.map((member, i) => (
            <li
              key={member.slug}
              className={clsx(
                'overflow-hidden rounded-3xl text-copy-black shadow-2xl',
                CARD_SURFACES[i % CARD_SURFACES.length],
              )}
            >
              <Portrait member={member} index={i} />
              <div className='flex items-start justify-between gap-4 p-6'>
                <div className='min-w-0'>
                  <h3 className='font-slay text-3xl uppercase leading-none'>{member.name}</h3>
                  <p className='mt-1 font-mono text-xs font-semibold uppercase tracking-widest'>{member.role}</p>
                  {member.bio && <p className='mt-3 line-clamp-3 text-base leading-snug'>{member.bio}</p>}
                </div>
                <div className='flex shrink-0 flex-col gap-2'>
                  {member.instagramUrl && (
                    <a
                      href={member.instagramUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      aria-label={`${member.name} on Instagram`}
                      className={clsx(SOCIAL_LINK, 'bg-copy-black')}
                    >
                      <InstagramIcon className='size-5' />
                    </a>
                  )}
                  {member.stravaUrl && (
                    <a
                      href={member.stravaUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      aria-label={`${member.name} on Strava`}
                      className={clsx(SOCIAL_LINK, 'bg-strava-orange')}
                    >
                      <StravaIcon className='size-5' />
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
