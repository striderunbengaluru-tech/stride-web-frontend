'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_RESET_MS = 2000

/**
 * Copy text and flip a `copied` flag for a moment. Fails soft: the Clipboard
 * API is absent on insecure origins and inside some in-app browsers, in which
 * case `copy` resolves false and the caller leaves the text selectable instead.
 */
export function useCopyToClipboard(resetMs = DEFAULT_RESET_MS) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return false
    }
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), resetMs)
    return true
  }, [resetMs])

  return { copied, copy }
}
