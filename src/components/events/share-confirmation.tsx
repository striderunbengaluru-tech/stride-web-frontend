'use client'

import { useState } from 'react'
import { MessageCircle, Instagram, Link2, Check } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { buildStoryCanvas } from '@/components/events/story-banner-download'

type Props = {
  eventName: string
  eventDate: string | null      // pre-formatted, e.g. "Sat, 28 Jun · 7:15 AM"
  eventLocation: string | null
  eventSlug: string
  eventUrl: string              // full canonical URL
  eventBannerUrl: string | null
}

const STRIDE_HANDLE = '@stride_runclub_bengaluru'

export function ShareConfirmation({
  eventName, eventDate, eventLocation, eventSlug, eventUrl, eventBannerUrl,
}: Props) {
  const [generatingImage, setGeneratingImage] = useState(false)
  const [copied, setCopied] = useState(false)

  // Clean message — no ZWJ emojis (older devices render them as garbage chars).
  // Single 🏃 emoji renders correctly across every platform.
  const whatsappText =
    `I'm running ${eventName}` +
    (eventDate ? ` on ${eventDate}` : '') +
    ` with Stride Run Club 🏃\n\n` +
    `Come run with me: ${eventUrl}`
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`

  async function handleInstagram() {
    setGeneratingImage(true)
    try {
      const blob = await buildStoryCanvas({
        eventName,
        eventDate,
        eventLocation,
        eventBannerUrl,
        eventSlug,
      })
      if (!blob) return

      const file = new File([blob], `stride-${eventSlug}.png`, { type: 'image/png' })

      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: eventName,
            text: `I'm running ${eventName} with ${STRIDE_HANDLE}`,
          })
          return
        } catch {
          // User cancelled or share failed — fall through to download
        }
      }

      // Desktop / unsupported fallback: download the image
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stride-${eventSlug}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setGeneratingImage(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(eventUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-3 gap-2.5'>

      {/* WhatsApp */}
      <a
        href={whatsappHref}
        target='_blank'
        rel='noopener noreferrer'
        className='group flex items-center gap-3 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 hover:border-green-400/40 transition-all px-4 py-3.5 min-h-14'
      >
        <span className='shrink-0 w-9 h-9 rounded-lg bg-green-500/15 border border-green-500/25 flex items-center justify-center group-hover:scale-110 transition-transform'>
          <MessageCircle size={16} className='text-green-400' strokeWidth={2.2} />
        </span>
        <span className='flex-1 min-w-0'>
          <span className='block text-white font-semibold text-sm leading-none'>WhatsApp</span>
          <span className='block text-white/40 text-[11px] mt-1'>Send to friends</span>
        </span>
      </a>

      {/* Instagram */}
      <button
        type='button'
        onClick={handleInstagram}
        disabled={generatingImage}
        className='group flex items-center gap-3 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 hover:border-pink-400/40 transition-all px-4 py-3.5 min-h-14 disabled:opacity-60 disabled:cursor-not-allowed text-left'
      >
        <span className='shrink-0 w-9 h-9 rounded-lg bg-pink-500/15 border border-pink-400/25 flex items-center justify-center group-hover:scale-110 transition-transform'>
          {generatingImage
            ? <Spinner className='text-pink-400' />
            : <Instagram size={16} className='text-pink-400' strokeWidth={2.2} />}
        </span>
        <span className='flex-1 min-w-0'>
          <span className='block text-white font-semibold text-sm leading-none'>
            {generatingImage ? 'Building…' : 'Instagram'}
          </span>
          <span className='block text-white/40 text-[11px] mt-1'>Story-ready image</span>
        </span>
      </button>

      {/* Copy link */}
      <button
        type='button'
        onClick={handleCopy}
        className={`group flex items-center gap-3 rounded-xl border transition-all px-4 py-3.5 min-h-14 text-left ${
          copied
            ? 'bg-green-500/10 border-green-500/40'
            : 'bg-white/4 border-white/10 hover:bg-white/8 hover:border-stride-yellow-accent/40'
        }`}
      >
        <span className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center group-hover:scale-110 transition-transform ${
          copied
            ? 'bg-green-500/20 border-green-500/40'
            : 'bg-stride-yellow-accent/15 border-stride-yellow-accent/25'
        }`}>
          {copied
            ? <Check size={16} className='text-green-400' strokeWidth={2.5} />
            : <Link2 size={16} className='text-stride-yellow-accent' strokeWidth={2.2} />}
        </span>
        <span className='flex-1 min-w-0'>
          <span className={`block font-semibold text-sm leading-none ${copied ? 'text-green-400' : 'text-white'}`}>
            {copied ? 'Copied!' : 'Copy link'}
          </span>
          <span className='block text-white/40 text-[11px] mt-1'>
            {copied ? 'Paste it anywhere' : 'Anywhere else'}
          </span>
        </span>
      </button>
    </div>
  )
}
