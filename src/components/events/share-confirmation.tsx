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

  const whatsappText =
    `I'm running ${eventName}` +
    (eventDate ? ` on ${eventDate}` : '') +
    ` with ${STRIDE_HANDLE} 🏃‍♂️\n` +
    `Join me: ${eventUrl}`
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

      // Web Share API with file support (mobile primarily)
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
    <div className='flex flex-col sm:flex-row gap-2.5'>
      {/* WhatsApp */}
      <a
        href={whatsappHref}
        target='_blank'
        rel='noopener noreferrer'
        className='flex-1 inline-flex items-center justify-center gap-2 bg-white/8 border border-white/15 text-white/80 hover:text-white hover:bg-white/12 hover:border-green-400/40 transition-all rounded-md px-4 py-2.5 text-sm font-medium min-h-11'
      >
        <MessageCircle size={15} className='text-green-400' />
        Share on WhatsApp
      </a>

      {/* Instagram */}
      <button
        type='button'
        onClick={handleInstagram}
        disabled={generatingImage}
        className='flex-1 inline-flex items-center justify-center gap-2 bg-white/8 border border-white/15 text-white/80 hover:text-white hover:bg-white/12 hover:border-pink-400/40 transition-all rounded-md px-4 py-2.5 text-sm font-medium min-h-11 disabled:opacity-60'
      >
        {generatingImage ? (
          <><Spinner /> Building image…</>
        ) : (
          <>
            <Instagram size={15} className='text-pink-400' />
            Share on Instagram
          </>
        )}
      </button>

      {/* Copy link */}
      <button
        type='button'
        onClick={handleCopy}
        className={`flex-1 inline-flex items-center justify-center gap-2 border rounded-md px-4 py-2.5 text-sm font-medium min-h-11 transition-all ${
          copied
            ? 'bg-green-500/15 border-green-500/40 text-green-400'
            : 'bg-white/8 border-white/15 text-white/80 hover:text-white hover:bg-white/12'
        }`}
      >
        {copied ? <Check size={15} /> : <Link2 size={15} />}
        {copied ? 'Link copied!' : 'Copy link'}
      </button>
    </div>
  )
}
