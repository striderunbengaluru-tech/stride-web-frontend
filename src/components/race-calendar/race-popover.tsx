'use client'

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, MapPin, X } from 'lucide-react'
import { formatDateFullIST, formatTimeIST } from '@/lib/utils/ist'
import { isRegistrationOpen, type RaceCardData } from '@/lib/races/present'
import { distanceLabel, sortDistances } from '@/types/race'
import { RaceDetailCtas } from './race-detail-ctas'

export type PopoverState = {
  /** preview: opened by hover/focus, closes when the pointer leaves chip and card. pinned: opened on purpose. */
  mode: 'preview' | 'pinned'
  anchor: HTMLElement
  races: RaceCardData[]
}

type Props = {
  state: PopoverState | null
  todayKey: string
  nowIso: string
  onClose: () => void
  /** The pointer entered the card — cancel any pending preview close. */
  onPointerEnter: () => void
  /** The pointer left the card — schedule a preview close. */
  onPointerLeave: () => void
}

const DESKTOP_QUERY = '(min-width: 640px)'
const VIEWPORT_MARGIN = 8
const ANCHOR_GAP = 6
const POPOVER_WIDTH = 288
/** Posters are portrait; a 4:3 band keeps the card short, with the full poster letterboxed over a blurred copy of itself. */
const POSTER_BAND = 'aspect-[4/3]'
const REVEAL_SECONDS = 0.18
const SHEET_SECONDS = 0.28

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Both read as external stores rather than set in an effect: one render with
// the right answer, no cascading update, and false/true on the server.
const noopSubscribe = () => () => {}
function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    onChange => {
      const media = window.matchMedia(DESKTOP_QUERY)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  )
}

/**
 * The card that opens from a calendar day. One instance per grid, rendered
 * through a portal so table overflow can never clip it. Anchored beside the
 * chip on wide screens and clamped to the viewport; a bottom sheet on phones,
 * where a 46px-wide cell has nothing to anchor to.
 *
 * The card is interactive in both modes. In preview mode it stays open while
 * the pointer is over the chip or the card and closes a beat after it leaves
 * both — the grid owns that timer and reports enter/leave through the props.
 */
export function RacePopover({ state, todayKey, nowIso, onClose, onPointerEnter, onPointerLeave }: Props) {
  const mounted = useMounted()
  const isDesktop = useIsDesktop()
  const [position, setPosition] = useState<{ top: number; left: number; above: boolean } | null>(null)
  const reduceMotion = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const lastAnchor = useRef<HTMLElement | null>(null)

  // Anchored placement: below the chip, flipped above when there is no room,
  // and never closer than VIEWPORT_MARGIN to either side. Re-measured on
  // scroll and resize while open, since position: fixed does not follow.
  useIsoLayoutEffect(() => {
    if (!state || !isDesktop) { setPosition(null); return }
    function place() {
      const panel = panelRef.current
      if (!panel || !state) return
      const anchor = state.anchor.getBoundingClientRect()
      const height = panel.offsetHeight
      const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2)
      const below = anchor.bottom + ANCHOR_GAP
      const fitsBelow = below + height <= window.innerHeight - VIEWPORT_MARGIN
      const top = fitsBelow ? below : Math.max(VIEWPORT_MARGIN, anchor.top - ANCHOR_GAP - height)
      const left = Math.min(Math.max(anchor.left, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN)
      setPosition({ top, left, above: !fitsBelow })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [state, isDesktop])

  // Pinned mode owns focus: move it in on open, hand it back on close, and
  // close on Escape or a click anywhere outside.
  useEffect(() => {
    if (!state || state.mode !== 'pinned') return
    lastAnchor.current = state.anchor
    const first = panelRef.current?.querySelector<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])')
    first?.focus({ preventScroll: true })

    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    function onDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || state?.anchor.contains(target)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      lastAnchor.current?.focus({ preventScroll: true })
    }
  }, [state, onClose])

  if (!mounted || !state) return null

  const pinned = state.mode === 'pinned'
  const dayLabel = formatDateFullIST(state.races[0].raceDate)
  const headingId = 'race-popover-heading'
  // Re-mounting on a new set of races replays the reveal; preview → pinned on the same chip does not.
  const revealKey = state.races.map(r => r.id).join(',')
  const revealDuration = reduceMotion ? 0 : REVEAL_SECONDS

  const body = (
    <>
      <div className='flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-white/10'>
        <p id={headingId} className='text-stride-yellow-accent text-xs font-bold font-mono'>
          {dayLabel}
        </p>
        <button type='button' onClick={onClose} aria-label='Close' className='-m-2 p-2 rounded-md text-white/50 hover:text-white min-h-11 min-w-11 inline-flex items-center justify-center'>
          <X size={16} aria-hidden='true' />
        </button>
      </div>
      <ul className='list-none m-0 p-0 divide-y divide-white/10 max-h-[60vh] overflow-y-auto'>
        {state.races.map(race => {
          const open = isRegistrationOpen(race, todayKey, nowIso)
          return (
            <li key={race.id} className='px-4 py-4 space-y-3'>
              {race.posterUrl && (
                <div className={`relative -mx-4 -mt-4 ${POSTER_BAND} bg-white/5 overflow-hidden`}>
                  <Image src={race.posterUrl} alt='' aria-hidden='true' fill sizes='64px' className='object-cover scale-125 blur-2xl opacity-70' />
                  <Image
                    src={race.posterUrl}
                    alt={`${race.name} poster`}
                    fill
                    sizes='(max-width: 640px) 100vw, 288px'
                    className='object-contain'
                  />
                </div>
              )}
              <div>
                <p className='font-libre text-white text-lg leading-snug line-clamp-2'>{race.name}</p>
                <p className='text-white/60 text-sm mt-1 flex items-center gap-1.5 min-w-0'>
                  <MapPin size={12} className='shrink-0 text-white/35' aria-hidden='true' />
                  <span className='truncate'>{[race.venue, race.city].filter(Boolean).join(', ')}</span>
                  {race.hasStartTime && <span className='shrink-0 text-white/40'>{formatTimeIST(race.raceDate)}</span>}
                </p>
                {race.distances.length > 0 && (
                  <p className='text-white/50 text-xs mt-1.5 font-semibold'>
                    {sortDistances(race.distances).map(distanceLabel).join(', ')}
                  </p>
                )}
              </div>
              <RaceDetailCtas registrationUrl={race.registrationUrl} couponCode={race.couponCode} discountPercent={race.discountPercent} open={open} layout='compact' />
              <Link
                href={`/race-calendar/${race.slug}`}
                prefetch={false}
                className='inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-stride-yellow-accent transition-colors min-h-11'
              >
                View details <ArrowRight size={14} aria-hidden='true' />
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )

  const panelChrome = 'bg-stride-purple-primary/95 backdrop-blur-xl border border-white/15 shadow-2xl'

  if (!isDesktop) {
    // Phones: a bottom sheet, always interactive.
    return createPortal(
      <div className='fixed inset-0 z-50 flex flex-col justify-end'>
        <motion.button
          type='button'
          onClick={onClose}
          aria-label='Close'
          className='absolute inset-0 bg-black/60'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : SHEET_SECONDS }}
        />
        <motion.div
          key={revealKey}
          ref={panelRef}
          role='dialog'
          aria-labelledby={headingId}
          className={`relative rounded-t-2xl max-h-[70dvh] overflow-hidden pb-[env(safe-area-inset-bottom)] ${panelChrome}`}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ duration: reduceMotion ? 0 : SHEET_SECONDS, ease: [0.22, 1, 0.36, 1] }}
        >
          {body}
        </motion.div>
      </div>,
      document.body,
    )
  }

  // Grows out of the chip: from the top edge when placed below it, from the
  // bottom edge when flipped above. Hidden until measured so the first frame
  // cannot flash at 0,0.
  const offsetY = position?.above ? 8 : -8
  return createPortal(
    <motion.div
      key={revealKey}
      ref={panelRef}
      role='dialog'
      aria-modal={false}
      aria-labelledby={headingId}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: POPOVER_WIDTH,
        visibility: position ? 'visible' : 'hidden',
        transformOrigin: position?.above ? 'bottom left' : 'top left',
      }}
      initial={{ opacity: 0, y: offsetY, scale: 0.96 }}
      animate={position ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: offsetY, scale: 0.96 }}
      transition={{ duration: revealDuration, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed z-50 max-w-[calc(100vw-16px)] rounded-xl overflow-hidden ${panelChrome} ${pinned ? 'ring-1 ring-stride-yellow-accent/40' : ''}`}
    >
      {body}
    </motion.div>,
    document.body,
  )
}
