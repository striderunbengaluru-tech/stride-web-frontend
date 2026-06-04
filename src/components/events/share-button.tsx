'use client'

import { useEffect, useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'

type Props = { title: string; url: string }

// Re-point a baked-in URL at the live address-bar origin so shared/copied links
// match the current environment (localhost / staging / production).
function useLiveUrl(initial: string): string {
  const [url, setUrl] = useState(initial)
  useEffect(() => {
    try {
      const u = new URL(initial)
      setUrl(`${window.location.origin}${u.pathname}${u.search}`)
    } catch {
      setUrl(initial)
    }
  }, [initial])
  return url
}

export function ShareButton({ title, url: initialUrl }: Props) {
  const url = useLiveUrl(initialUrl)
  const [state, setState] = useState<'idle' | 'copied'>('idle')

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // user cancelled — do nothing
        return
      }
    }
    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
      setTimeout(() => setState('idle'), 2500)
    } catch {}
  }

  return (
    <button
      onClick={handleShare}
      className='inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white/70 hover:text-white hover:bg-white/12 hover:border-white/25 transition-all duration-200 text-sm font-medium'
    >
      {state === 'copied' ? (
        <>
          <Check size={15} className='text-green-400 shrink-0' />
          <span className='text-green-400'>Link copied!</span>
        </>
      ) : (
        <>
          <Share2 size={15} className='shrink-0' />
          Share event
        </>
      )}
    </button>
  )
}

// Separate copy-only button used in admin
export function CopyLinkWidget({ url: initialUrl }: { url: string }) {
  const url = useLiveUrl(initialUrl)
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <button onClick={handleCopy} className='inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-xs transition-colors'>
      {copied ? <Check size={12} className='text-green-400' /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}
