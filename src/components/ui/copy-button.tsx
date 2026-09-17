'use client'

import { Check, Copy } from 'lucide-react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

type Props = {
  /** The text that lands on the clipboard. */
  value: string
  label: string
  copiedLabel?: string
  className?: string
  /** 'solid' is the yellow CTA; 'ghost' sits beside a mono code readout. */
  variant?: 'solid' | 'ghost'
}

const VARIANT_CLASSES = {
  solid: 'bg-stride-yellow-accent text-copy-black hover:bg-stride-yellow-accent/90',
  ghost: 'bg-white/8 border border-white/15 text-white hover:border-stride-yellow-accent/50',
} as const

/**
 * Copy-to-clipboard CTA with a visible "Copied" state. The status is announced
 * through a polite live region so screen-reader users hear the confirmation
 * the sighted user sees.
 */
export function CopyButton({ value, label, copiedLabel = 'Copied', className = '', variant = 'solid' }: Props) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <button
      type='button'
      onClick={() => { void copy(value) }}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-bold min-h-11 transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {copied ? <Check size={16} aria-hidden='true' /> : <Copy size={16} aria-hidden='true' />}
      <span aria-live='polite'>{copied ? copiedLabel : label}</span>
    </button>
  )
}
