'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

export type TimelineEntry = {
  /** Sticky heading beside the node on desktop, inline above the card on mobile. */
  title: string
  /** Rendered to the right of the rail. Server-rendered nodes are fine here. */
  content: React.ReactNode
  /**
   * Optional artwork shown directly under the title — in the sticky column on
   * desktop, under the inline heading on mobile. Like `title`, it renders once
   * per breakpoint (only one is ever visible).
   */
  media?: React.ReactNode
  /** Marks the viewer's position — lights up the node, rail and heading. */
  isCurrent?: boolean
}

type Props = {
  data: TimelineEntry[]
  className?: string
  /** Accessible name for the list of entries. */
  label?: string
}

/**
 * Vertical timeline with a scroll-driven beam that fills the rail as the
 * visitor moves down the list. Layout is single-column on mobile (node + card,
 * heading inline) and splits into a sticky heading column from `md:` up.
 */
export function Timeline({ data, className, label = 'Timeline' }: Props) {
  const listRef = useRef<HTMLOListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [railHeight, setRailHeight] = useState(0)

  // The rail is absolutely positioned, so its height has to be measured from
  // the list. A one-shot measurement goes stale the moment anything reflows —
  // breakpoint change, font swap, copy wrapping onto another line — leaving the
  // rail short on desktop and overlong on mobile, so observe it instead.
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setRailHeight(entry?.contentRect.height ?? 0)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 15%', 'end 60%'],
  })
  const beamHeight = useTransform(scrollYProgress, [0, 1], [0, railHeight])
  const beamOpacity = useTransform(scrollYProgress, [0, 0.08], [0, 1])

  return (
    <div ref={containerRef} className={cn('w-full', className)}>
      <ol ref={listRef} className='relative' aria-label={label}>

        {data.map((item, index) => (
          <li
            key={index}
            className='flex justify-start pt-8 first:pt-2 md:pt-16 md:first:pt-4 md:gap-10'
          >
            {/* Node + sticky heading. `top-28` clears the fixed navbar. */}
            <div className='sticky top-28 z-20 flex flex-col md:flex-row items-center self-start max-w-40 md:max-w-xs lg:max-w-sm md:w-full'>
              <span
                aria-hidden='true'
                className={cn(
                  'absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors',
                  item.isCurrent
                    ? 'border-stride-yellow-accent/60 bg-stride-purple-primary'
                    : 'border-white/15 bg-white/10'
                )}
              >
                <span
                  className={cn(
                    'h-3 w-3 rounded-full',
                    item.isCurrent ? 'bg-stride-yellow-accent' : 'bg-white/30'
                  )}
                />
              </span>
              <div className='hidden md:block md:pl-20'>
                <h3
                  className={cn(
                    'font-libre text-2xl lg:text-3xl font-bold leading-tight text-balance',
                    item.isCurrent ? 'text-stride-yellow-accent' : 'text-white/35'
                  )}
                >
                  {item.title}
                </h3>
                {item.media && <div className='mt-5'>{item.media}</div>}
              </div>
            </div>

            <div className='relative w-full min-w-0 pl-14 md:pl-4'>
              <h3
                className={cn(
                  'md:hidden mb-3 font-libre text-xl font-bold leading-tight',
                  item.isCurrent ? 'text-stride-yellow-accent' : 'text-white/45'
                )}
              >
                {item.title}
              </h3>
              {item.media && <div className='md:hidden mb-4'>{item.media}</div>}
              {item.content}
            </div>
          </li>
        ))}

        {/* Rail — centred on the 40px nodes (left-5 = 20px) at every breakpoint.
            Masked at both ends so it fades instead of stopping abruptly. */}
        <div
          aria-hidden='true'
          style={{ height: `${railHeight}px` }}
          className='absolute left-5 top-0 w-px overflow-hidden bg-linear-to-b from-transparent via-white/15 to-transparent mask-[linear-gradient(to_bottom,transparent_0%,black_8%,black_92%,transparent_100%)]'
        >
          <motion.div
            style={{ height: beamHeight, opacity: beamOpacity }}
            className='absolute inset-x-0 top-0 w-px rounded-full bg-linear-to-t from-stride-yellow-accent via-stride-yellow-accent/50 to-transparent'
          />
        </div>
      </ol>
    </div>
  )
}
