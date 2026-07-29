'use client'

import { useState } from 'react'
import { Share, Copy, Check, X } from 'lucide-react'

type Props = {
  url: string
  title: string
  text?: string
}

export function ShareButton({ url: initialUrl, title }: Props) {
  const [showFallback, setShowFallback] = useState(false)
  const [copied, setCopied] = useState(false)
  // URL shown inside the fallback modal; resolved client-side when it opens.
  const [url, setUrl] = useState(initialUrl)

  // Build the link from the live address bar so it matches the current
  // environment (localhost / staging / production), stripping any query
  // string or hash so nothing extra is appended to the shared link.
  function resolveShareUrl() {
    if (typeof window === 'undefined') return initialUrl
    return window.location.origin + window.location.pathname
  }

  async function handleShare() {
    const shareUrl = resolveShareUrl()
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        // Share only the title + url. Passing `text` causes many targets
        // (WhatsApp, Messages, etc.) to concatenate it onto the link, which
        // is what produces a URL with extra text appended.
        await navigator.share({ url: shareUrl, title })
        return
      } catch {
        // AbortError means user cancelled — don't show fallback
        return
      }
    }
    setUrl(shareUrl)
    setShowFallback(true)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resolveShareUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API blocked — ignore
    }
  }

  return (
    <>
      <button
        type='button'
        onClick={handleShare}
        className='w-9 h-9 flex items-center justify-center rounded-full bg-white/6 border border-white/12 text-white/40 hover:text-white hover:border-white/25 transition-colors'
        aria-label='Share profile'
      >
        <Share size={15} aria-hidden='true' />
      </button>

      {showFallback && (
        <div
          className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4'
          onClick={() => setShowFallback(false)}
        >
          <div
            className='bg-stride-purple-primary border border-white/15 rounded-xl p-5 w-full max-w-sm'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between mb-4'>
              <p className='text-white font-semibold text-sm'>Share profile</p>
              <button
                type='button'
                onClick={() => setShowFallback(false)}
                className='text-white/40 hover:text-white transition-colors'
                aria-label='Close'
              >
                <X size={18} />
              </button>
            </div>

            {/* URL + copy */}
            <div className='flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 mb-4'>
              <span className='text-white/50 text-xs truncate flex-1'>{url}</span>
              <button
                type='button'
                onClick={copyLink}
                className='text-stride-yellow-accent shrink-0 hover:opacity-80 transition-opacity'
                aria-label='Copy link'
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>

            {/* Share options */}
            <div className='flex gap-2'>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1 text-center bg-white/10 hover:bg-white/15 text-white/80 text-xs py-2.5 rounded-md transition-colors'
              >
                X / Twitter
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1 text-center bg-white/10 hover:bg-white/15 text-white/80 text-xs py-2.5 rounded-md transition-colors'
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
