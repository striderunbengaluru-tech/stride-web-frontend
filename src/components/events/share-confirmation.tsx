'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { InstagramIcon } from '@/components/ui/brand-icons'
import { buildStoryCanvas } from '@/components/events/story-banner-download'

type Props = {
  eventName: string
  eventDate: string | null      // pre-formatted, e.g. "Sat, 28 Jun · 7:15 AM"
  eventLocation: string | null
  eventSlug: string
  eventBannerUrl: string | null
}

const STRIDE_HANDLE = '@stride_runclub_bengaluru'

export function ShareConfirmation({
  eventName, eventDate, eventLocation, eventSlug, eventBannerUrl,
}: Props) {
  const [generatingImage, setGeneratingImage] = useState(false)
  // Build the share URL from the live address bar so it always reflects the
  // current environment (localhost / staging / production) — not a baked-in host.
  const [eventUrl, setEventUrl] = useState('')
  useEffect(() => {
    setEventUrl(`${window.location.origin}/events/${eventSlug}`)
  }, [eventSlug])

  // Clean message — no ZWJ emojis (older devices render them as garbage chars).
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

  return (
    <div className='flex items-center gap-3'>
      {/* WhatsApp */}
      <a
        href={whatsappHref}
        target='_blank'
        rel='noopener noreferrer'
        aria-label='Share on WhatsApp'
        className='group w-12 h-12 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 hover:border-green-400/40 transition-all flex items-center justify-center'
      >
        <MessageCircle size={20} className='text-green-400 group-hover:scale-110 transition-transform' strokeWidth={2.2} />
      </a>

      {/* Instagram */}
      <button
        type='button'
        onClick={handleInstagram}
        disabled={generatingImage}
        aria-label='Share to Instagram story'
        className='group w-12 h-12 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 hover:border-pink-400/40 transition-all flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed'
      >
        {generatingImage
          ? <Spinner className='text-pink-400' />
          : <InstagramIcon className='w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform' />}
      </button>
    </div>
  )
}
