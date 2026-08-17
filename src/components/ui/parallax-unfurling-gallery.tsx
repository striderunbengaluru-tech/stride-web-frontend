'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'

/**
 * Scroll-driven gallery: a rounded banner unfurls to full bleed, then a 3D
 * matrix of photo columns rotates towards the viewer while the columns drift
 * past each other at different rates.
 *
 * The images are decorative (`alt=''`) — the section is a mood piece for the
 * content below it, not a way to get at any individual photo. Nothing in here
 * is focusable or clickable.
 *
 * Driven by the *page* scroll on purpose. An earlier version owned an inner
 * `overflow-y-auto` element, which trapped the wheel/touch scroll and left the
 * navbar, footer and back-to-top button unreachable from this section.
 */

/** Columns in the matrix. Columns past `HIDE_ON_MOBILE` are desktop-only. */
const COLUMN_COUNT = 7

/** Columns rendered on mobile; the rest are desktop-only. */
const HIDE_ON_MOBILE = 3

/**
 * Where the reveal title starts and finishes fading in, as a fraction of the
 * section's scroll. It lands as the matrix settles, so the wall reads as the
 * lead-in to the heading rather than competing with it.
 */
const TITLE_FADE_START = 0.72
const TITLE_FADE_END = 0.92

const DESKTOP_QUERY = '(min-width: 768px)'

function subscribeToDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/**
 * `true` from Tailwind's `md` up. Read through `useSyncExternalStore` rather
 * than an effect so the server snapshot is explicit (mobile-first) and there is
 * no setState-during-effect.
 */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false
  )
}

type Props = {
  /** Absolute image URLs, distributed round-robin across the columns. */
  images: string[]
  /** Describes the section for screen readers, e.g. 'Lead Striders gallery'. */
  label: string
  /**
   * Heading revealed over the wall as the scroll completes. Rendered as the
   * page's `h1`, so the copy stays owned by the page rather than this primitive.
   */
  revealTitle: string
}

/**
 * Shared frame for one photo slot — fixed height so the column never reflows.
 * Deliberately small: more, smaller tiles fill the opening view and read as an
 * immersive wall, where four big tiles read as a row of cards.
 */
const SLOT_FRAME =
  'relative h-[240px] w-full flex-shrink-0 overflow-hidden rounded-md bg-white/5 backface-hidden sm:h-[290px] md:h-[330px]'

const SLOT_SIZES = '(min-width: 768px) 17vw, 39vw'

function GalleryImage({ src, priority }: { src: string; priority: boolean }) {
  return (
    <div className={SLOT_FRAME}>
      <Image
        src={src}
        alt=''
        aria-hidden='true'
        fill
        sizes={SLOT_SIZES}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        className='object-cover opacity-80'
      />
    </div>
  )
}

/**
 * Tiles a column needs to stay full at both drift extremes.
 *
 * A column of content height H, centred in the matrix box of height B and
 * shifted by `f`x its own height, only covers the box while `H * (1 - 2f) >= B`.
 * The old 40-45% drift made that unsatisfiable — a 375px-wide phone would have
 * needed ~10,000px of tiles — which is exactly the empty gap that showed at the
 * bottom of the mobile wall once the scroll finished. Capping drift at
 * `MAX_DRIFT` and shortening the box to `MATRIX_HEIGHT` brings the requirement
 * down to ~1,900px, which eight 300px+ tiles clear on every size down to 375px.
 * (The column length is rounded up to a whole multiple of its distinct photos —
 * with 24 photos over 6 columns that is 4, so this floor of 8 renders as 8.)
 */
const MIN_PER_COLUMN = 8

/** Largest share of its own height any column is translated by. */
const MAX_DRIFT = 0.16

/** Height of the rotating matrix. Shorter than the old 150vh for the same reason. */
const MATRIX_HEIGHT = 'h-[120vh]'

/**
 * Width of the rotating matrix. Wider than the viewport on purpose, and the
 * columns inside it are `flex-1`, so they divide this width exactly and the
 * leftmost/rightmost edges sit off screen. The old fixed column widths
 * (44vw x2, 15vw x6) summed to ~91vw inside a centred 130vw box, which is what
 * left the empty gutters down either side.
 */
const MATRIX_WIDTH = 'w-[115vw]'

/**
 * Scale the matrix starts at, cancelling out how much the opening depth and yaw
 * shrink it on screen.
 *
 * At the start the matrix sits at `z: -1600` (perspective scale ~0.58) and is
 * yawed (cos 45deg ~0.71 on desktop, cos 22.5deg ~0.98 on mobile), so a 115vw
 * matrix only *looks* ~47vw wide — the opening view was over half empty. Scaling
 * up by the inverse restores a full-bleed first fold while leaving the
 * perspective distortion, and therefore the sense of depth, untouched. It
 * resolves to 1 as the wall arrives, where 115vw already overflows the viewport.
 */
const START_SCALE_DESKTOP = 2.15
const START_SCALE_MOBILE = 1.7

/**
 * Gap between column advances — something on the wall pops every 1.5s. Exactly
 * one column advances per tick, so a column's own photos change every
 * `COLUMN_COUNT` x this, and only its tiles animate at once.
 */
const TICK_MS = 1500

/** Longest pop delay within a group, spreading it into a cascade. */
const MAX_POP_DELAY_S = 0.45

/**
 * Distance between neighbouring columns' start index into the shuffled deck.
 *
 * Two tiles show the same photo only when their deck indices match. A column's
 * index advances by 1 per slot and by at most 1 between columns mid-cycle, so
 * spacing columns a clean 3 apart makes every pairwise offset a multiple of 3 —
 * which can never equal that +/-1 slack. Consequences, all arithmetic rather
 * than hoped for:
 *   - no two tiles in the same ROW are ever the same photo
 *   - no two tiles in the same COLUMN are ever the same photo
 *   - diagonal neighbours can never match either
 * The nearest a photo can repeat is one column over and two rows away, which at
 * a 330px tile is ~660px apart on screen.
 */
const COLUMN_STRIDE = 3

/**
 * Deterministic shuffle (mulberry32). The order has to be identical on the
 * server and the client — a live `Math.random()` hydrated mismatched — so the
 * scatter is fixed per deck rather than per page load.
 */
function seededShuffle(items: string[], seed: number): string[] {
  const out = [...items]
  let state = seed
  const random = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Every column draws from the whole shuffled deck rather than a fixed slice of
 * it. The old version partitioned the photos round-robin, which left each column
 * with only three or four distinct images repeating down its length — that is
 * where the visible pairs came from.
 */
function useDeck(images: string[]): string[] {
  return useMemo(() => seededShuffle(images, 0x5721de), [images])
}

/** Monotonic counter driving every slot. One timer for the whole wall. */
function useTick(active: boolean): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [active])
  return tick
}

type SlotProps = {
  /** The photo to show. Changing it is what triggers the pop. */
  src: string
  /** Position in the column. Sets the pop order within the cascade. */
  slotIndex: number
  priority: boolean
}

/**
 * One photo slot that pops the next photo in over the outgoing one.
 *
 * Exit animates opacity only: the outgoing photo holds its size and position
 * underneath while the incoming one scales up over it, so the slot is never
 * empty or mid-shrink. Scale runs on a spring for the overshoot that reads as a
 * "pop" rather than a fade.
 */
function GallerySlot({ src, slotIndex, priority }: SlotProps) {
  const delay = ((slotIndex * 0.11) % MAX_POP_DELAY_S).toFixed(2)

  return (
    <div className={SLOT_FRAME}>
      <AnimatePresence initial={false}>
        <motion.div
          key={src}
          className='absolute inset-0'
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            scale: { type: 'spring', stiffness: 260, damping: 18, delay: Number(delay) },
            opacity: { duration: 0.4, delay: Number(delay) },
          }}
        >
          <Image
            src={src}
            alt=''
            aria-hidden='true'
            fill
            sizes={SLOT_SIZES}
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            className='object-cover opacity-80'
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/**
 * Reduced-motion fallback. Scroll-linked 3D rotation is motion the reader
 * explicitly asked not to see, so they get the same photos as a flat grid.
 */
function StaticGallery({ images, label, revealTitle }: Props) {
  return (
    // Top padding clears the fixed navbar: this variant is a normal-flow grid
    // and, as the first thing on the page, would otherwise start underneath it.
    // The parallax variant needs none — it fills a 100vh sticky frame.
    <section aria-label={label} className='w-full px-4 pt-28 pb-10'>
      <div className='mx-auto grid max-w-6xl grid-cols-3 gap-3 md:grid-cols-6 md:gap-4'>
        {images.slice(0, 12).map((src, i) => (
          <GalleryImage key={src} src={src} priority={i === 0} />
        ))}
      </div>
      {/* The heading is scroll-revealed in the animated variant; here it simply
          follows the grid, so the page still has its `h1` either way. */}
      <h1 className={`${REVEAL_TITLE_CLASS} mt-12`}>{revealTitle}</h1>
    </section>
  )
}

/**
 * Scaled up well past the homepage section headings on desktop, where the wall
 * fills the viewport and a 5xl heading read as small against it. `text-balance`
 * evens the line lengths; the caller keeps the words that must not split
 * together with a non-breaking space.
 */
const REVEAL_TITLE_CLASS =
  'text-balance text-center font-libre text-4xl font-bold leading-tight text-stride-yellow-accent sm:text-5xl md:text-6xl lg:text-7xl'

function ParallaxGallery({ images, label, revealTitle }: Props) {
  const containerRef = useRef<HTMLElement>(null)
  const isDesktop = useIsDesktop()
  const deck = useDeck(images)

  // The wall only cycles while it is on screen — the section scrolls away well
  // before the cards below it, and animating 32 offscreen slots forever is pure
  // battery drain.
  const inView = useInView(containerRef)
  const tick = useTick(inView)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })
  const progress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 20,
    mass: 0.5,
  })

  // Rotation is halved on mobile: at 375px a 45° yaw swings the visible columns
  // most of the way off-screen and the photos read as slivers.
  const amp = isDesktop ? 1 : 0.5
  // Every axis resolves to exactly 0, so the wall finishes perfectly upright and
  // square to the viewport rather than holding a residual tilt. The leftover
  // 4/-8/2 degrees it used to end on read as "unfinished", and a tilted grid
  // also hides its own edges — flat means the column coverage above has to be
  // right, which is why MAX_DRIFT exists.
  const rotateX = useTransform(progress, [0, 1], [25 * amp, 0])
  const rotateY = useTransform(progress, [0, 1], [-45 * amp, 0])
  const rotateZ = useTransform(progress, [0, 1], [15 * amp, 0])
  // Depth doubled from -800: the tiles now start much further back, so the
  // wall reads as a corridor of photos rather than a nearly-flat sheet.
  const translateZ = useTransform(progress, [0, 1], [-1600, 0])
  const matrixScale = useTransform(
    progress,
    [0, 1],
    [isDesktop ? START_SCALE_DESKTOP : START_SCALE_MOBILE, 1]
  )

  // Alternating drift directions are what make the columns read as separate
  // planes rather than one sliding sheet. One entry per column.
  // Expressed as fractions of MAX_DRIFT so no column can exceed the cap the
  // coverage maths above depends on.
  const drift = (f: number) => `${(f * MAX_DRIFT * 100).toFixed(1)}%`
  const columnY = [
    useTransform(progress, [0, 1], [drift(0), drift(-1)]),
    useTransform(progress, [0, 1], [drift(-1), drift(0.38)]),
    useTransform(progress, [0, 1], [drift(0), drift(-0.88)]),
    useTransform(progress, [0, 1], [drift(-0.75), drift(0.5)]),
    useTransform(progress, [0, 1], [drift(-0.38), drift(-1)]),
    useTransform(progress, [0, 1], [drift(-1), drift(0.13)]),
    useTransform(progress, [0, 1], [drift(-0.5), drift(-1)]),
  ]
  // One drift track per column. A short array would leave the last column's `y`
  // undefined and it would sit perfectly still while its neighbours drifted.
  if (columnY.length !== COLUMN_COUNT) {
    throw new Error(
      `columnY has ${columnY.length} tracks but COLUMN_COUNT is ${COLUMN_COUNT}`
    )
  }

  // Reveal heading — fades up as the matrix settles at the end of the scroll.
  const titleOpacity = useTransform(progress, [TITLE_FADE_START, TITLE_FADE_END], [0, 1])
  const titleY = useTransform(progress, [TITLE_FADE_START, TITLE_FADE_END], [28, 0])
  // The wall dims behind the heading so the type has somewhere to sit.
  const scrimOpacity = useTransform(progress, [TITLE_FADE_START, TITLE_FADE_END], [0, 1])

  return (
    <section
      ref={containerRef}
      aria-label={label}
      className='relative h-[250vh] w-full'
    >
      {/* Full-bleed: no framed banner, no border, no radius. The wall runs to
          the edges of the viewport from the first pixel of scroll, so the
          opening view is photos rather than a card sitting on a background. */}
      <div className='sticky top-0 h-screen w-full overflow-hidden bg-stride-purple-primary'>
        <div
          className='pointer-events-none absolute inset-0 flex items-center justify-center'
          style={{ perspective: '2200px' }}
        >
          {/* Vignettes that fade the matrix into the page background. Tinted
              with the brand purple (via its theme CSS variable) so the edges
              dissolve instead of ending in a black band. */}
          <div className='absolute inset-0 z-20 shadow-[inset_0_100px_150px_-50px_var(--color-stride-purple-primary),inset_0_-100px_150px_-50px_var(--color-stride-purple-primary)]' />
          <div className='absolute inset-0 z-20 shadow-[inset_150px_0_150px_-50px_var(--color-stride-purple-primary),inset_-150px_0_150px_-50px_var(--color-stride-purple-primary)]' />

          <motion.div
            style={{
              rotateX,
              rotateY,
              rotateZ,
              z: translateZ,
              scale: matrixScale,
            }}
            className={`flex ${MATRIX_HEIGHT} ${MATRIX_WIDTH} origin-center items-center justify-center gap-2.5 transform-3d will-change-transform backface-hidden md:gap-4`}
          >
            {Array.from({ length: COLUMN_COUNT }, (_, col) => {
              // Exactly one column advances per tick: `step` rolls over for a
              // single `col` on any given tick, so only that column's tiles
              // animate and every other column holds. Neighbouring columns are
              // therefore never more than one step apart, which is the slack
              // COLUMN_STRIDE is chosen to absorb.
              const step = Math.floor((tick + col) / COLUMN_COUNT)
              return (
                <motion.div
                  key={col}
                  style={{ y: columnY[col] }}
                  className={`flex flex-1 min-w-0 flex-col gap-2.5 will-change-transform md:gap-4 ${
                    col >= HIDE_ON_MOBILE ? 'hidden md:flex' : ''
                  }`}
                >
                  {Array.from({ length: MIN_PER_COLUMN }, (_, j) => (
                    <GallerySlot
                      key={j}
                      src={deck[(col * COLUMN_STRIDE + j + step) % deck.length]}
                      slotIndex={j}
                      priority={col === 0 && j === 0}
                    />
                  ))}
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* Reveal heading, on top of the wall at the end of the scroll. */}
        <motion.div
          aria-hidden='true'
          style={{ opacity: scrimOpacity }}
          className='pointer-events-none absolute inset-0 z-30 bg-stride-purple-primary/70'
        />
        <motion.div
          style={{ opacity: titleOpacity, y: titleY }}
          className='pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-6'
        >
          <h1 className={REVEAL_TITLE_CLASS}>{revealTitle}</h1>
        </motion.div>
      </div>
    </section>
  )
}

export function ParallaxUnfurlingGallery(props: Props) {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return <StaticGallery {...props} />
  return <ParallaxGallery {...props} />
}
