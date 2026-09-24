'use client'

import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

export type SegmentedOption<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name for the group, e.g. "Leaderboard". */
  label: string
  /** Prefix for tab/panel ids; the panel should carry `${idPrefix}-panel`. */
  idPrefix: string
  className?: string
}

/**
 * A tab-style switch between a few views of the same content. Implements the
 * WAI-ARIA tabs pattern: arrow keys (plus Home/End) move and activate the
 * selection, and only the selected tab sits in the tab order.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  idPrefix,
  className,
}: Props<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = options.findIndex(option => option.value === value)
    const last = options.length - 1
    const next =
      event.key === 'ArrowRight' ? (current === last ? 0 : current + 1)
      : event.key === 'ArrowLeft' ? (current === 0 ? last : current - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null
    if (next === null) return
    event.preventDefault()
    onChange(options[next].value)
    tabRefs.current[next]?.focus()
  }

  return (
    <div
      role='tablist'
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex rounded-xl border border-white/15 bg-white/10 p-1 backdrop-blur-md',
        className
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={el => { tabRefs.current[index] = el }}
            type='button'
            role='tab'
            id={`${idPrefix}-tab-${option.value}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-11 flex-1 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-yellow-accent',
              selected
                ? 'bg-stride-yellow-accent text-copy-black'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
