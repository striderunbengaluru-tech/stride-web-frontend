import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type PageHeaderProps = {
  /** Small label above the title, e.g. the section this page belongs to. */
  eyebrow: string
  title: string
  description: string
  /** Optional right-aligned stat line (mono), e.g. "3 upcoming races". */
  meta?: ReactNode
  /** Renders a "Back home" link above the eyebrow. */
  backHref?: string
}

/**
 * Listing-page header shared by /events and /race-calendar: a yellow-dashed
 * eyebrow, a serif display title, one line of copy and an optional stat that
 * sits to the right on desktop and stacks beneath on mobile.
 */
export function PageHeader({ eyebrow, title, description, meta, backHref }: PageHeaderProps) {
  return (
    <div className='mb-10 sm:mb-14 grid grid-cols-1 lg:grid-cols-[1fr_auto] lg:items-end gap-6'>
      <div>
        {backHref && (
          <Link
            href={backHref}
            className='mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/60 hover:text-stride-yellow-accent transition-colors'
          >
            <ArrowLeft size={16} aria-hidden='true' />
            Back home
          </Link>
        )}
        <p className='flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-stride-yellow-accent'>
          <span className='h-px w-6 bg-stride-yellow-accent' aria-hidden='true' />
          {eyebrow}
        </p>
        <h1 className='mt-4 text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[0.95] tracking-tight text-balance'>
          {title}
        </h1>
        <p className='mt-5 max-w-xl text-lg leading-relaxed text-white/55'>{description}</p>
      </div>
      {meta && <p className='font-mono text-sm text-white/45 lg:text-right lg:pb-2'>{meta}</p>}
    </div>
  )
}
