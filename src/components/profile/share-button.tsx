'use client'

import { useState } from 'react'
import { Share2, Copy, Check, X } from 'lucide-react'

type Props = {
  url: string
  title: string
  text?: string
}

export function ShareButton({ url, title, text }: Props) {
  const [showFallback, setShowFallback] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ url, title, ...(text ? { text } : {}) })
        return
      } catch {
        // AbortError means user cancelled — don't show fallback
        return
      }
    }
    setShowFallback(true)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
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
        className='flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm font-medium min-h-11 px-4 py-2 rounded-md border border-white/20 hover:border-stride-yellow-accent/50'
        aria-label='Share profile'
      >
        <Share2 size={14} aria-hidden='true' />
        <span>Share</span>
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
