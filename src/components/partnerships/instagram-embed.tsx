'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void
      }
    }
  }
}

type Props = {
  url: string
}

export default function InstagramEmbed({ url }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const processEmbed = () => {
      if (window.instgrm) {
        window.instgrm.Embeds.process()
        return
      }
      const script = document.getElementById('instagram-embed-script')
      if (!script) {
        const s = document.createElement('script')
        s.id = 'instagram-embed-script'
        s.src = '//www.instagram.com/embed.js'
        s.async = true
        s.onload = () => window.instgrm?.Embeds.process()
        document.body.appendChild(s)
      }
    }
    processEmbed()
  }, [url])

  return (
    <div ref={containerRef} className='flex justify-center w-full'>
      <blockquote
        className='instagram-media !max-w-full !min-w-0 !w-full'
        data-instgrm-permalink={url}
        data-instgrm-version='14'
        data-instgrm-captioned
        style={{ margin: 0, width: '100%' }}
      >
        <a href={url} target='_blank' rel='noopener noreferrer' className='text-copy-white/50 text-sm'>
          View on Instagram
        </a>
      </blockquote>
    </div>
  )
}
