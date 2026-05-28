'use client'

import { useRef, useState } from 'react'
import { Download } from 'lucide-react'

type Props = {
  eventName: string
  eventDate: string | null
  eventLocation: string | null
  runnerTag: string | null
  eventBannerUrl: string | null
}

const CANVAS_W = 1080
const CANVAS_H = 1920
const BRAND_PURPLE = '#4B2862'
const BRAND_YELLOW = '#E1D03F'

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY)
      line = words[n] + ' '
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line.trim(), x, currentY)
  return currentY
}

export function StoryBannerDownload({ eventName, eventDate, eventLocation, runnerTag, eventBannerUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [generating, setGenerating] = useState(false)

  async function generate() {
    const canvas = canvasRef.current
    if (!canvas) return
    setGenerating(true)

    const ctx = canvas.getContext('2d')
    if (!ctx) { setGenerating(false); return }

    canvas.width = CANVAS_W
    canvas.height = CANVAS_H

    // ── Background gradient ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    bgGrad.addColorStop(0, '#2a1240')
    bgGrad.addColorStop(0.5, BRAND_PURPLE)
    bgGrad.addColorStop(1, '#1a0a2e')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // ── Subtle dot pattern ──
    ctx.fillStyle = 'rgba(255,255,255,0.025)'
    for (let x = 60; x < CANVAS_W; x += 80) {
      for (let y = 60; y < CANVAS_H; y += 80) {
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // ── Event image (top section) ──
    const IMAGE_H = 1150
    if (eventBannerUrl) {
      try {
        await new Promise<void>((resolve) => {
          const img = new window.Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            // Cover-fit: fill the top section
            const scale = Math.max(CANVAS_W / img.naturalWidth, IMAGE_H / img.naturalHeight)
            const sw = img.naturalWidth * scale
            const sh = img.naturalHeight * scale
            const sx = (CANVAS_W - sw) / 2
            const sy = (IMAGE_H - sh) / 2
            ctx.drawImage(img, sx, sy, sw, sh)
            resolve()
          }
          img.onerror = () => resolve()
          img.src = eventBannerUrl
        })
      } catch {}
    }

    // ── Gradient overlay on image (purple fade in) ──
    const imgFade = ctx.createLinearGradient(0, IMAGE_H * 0.4, 0, IMAGE_H + 40)
    imgFade.addColorStop(0, 'rgba(75,40,98,0)')
    imgFade.addColorStop(0.5, 'rgba(75,40,98,0.7)')
    imgFade.addColorStop(1, 'rgba(75,40,98,1)')
    ctx.fillStyle = imgFade
    ctx.fillRect(0, 0, CANVAS_W, IMAGE_H + 40)

    // ── "STRIDE" brand — top left ──
    ctx.font = 'bold 52px Arial, sans-serif'
    ctx.fillStyle = BRAND_YELLOW
    ctx.letterSpacing = '8px'
    ctx.fillText('STRIDE', 80, 110)

    ctx.font = '28px Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('Run Club · Bengaluru', 80, 158)
    ctx.letterSpacing = '0px'

    // ── "I'm running this!" section ──
    const CONTENT_TOP = IMAGE_H + 60

    ctx.font = 'bold 68px Arial, sans-serif'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText("I'm running this! 🏃", 80, CONTENT_TOP)

    // ── Event name ──
    ctx.font = 'bold 86px Arial, sans-serif'
    ctx.fillStyle = '#FFFFFF'
    const nameY = wrapText(ctx, eventName, 80, CONTENT_TOP + 100, CANVAS_W - 160, 100)

    // ── Date & location ──
    let detailY = nameY + 70
    if (eventDate) {
      ctx.font = '44px Arial, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.fillText(`📅 ${eventDate}`, 80, detailY)
      detailY += 65
    }
    if (eventLocation) {
      ctx.font = '44px Arial, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.fillText(`📍 ${eventLocation}`, 80, detailY)
      detailY += 80
    }

    // ── Runner tag pill ──
    if (runnerTag) {
      const PILL_X = 80
      const PILL_Y = detailY + 20
      const PILL_H = 100
      const PILL_W = 320

      drawRoundedRect(ctx, PILL_X, PILL_Y, PILL_W, PILL_H, 50)
      ctx.fillStyle = BRAND_YELLOW
      ctx.fill()

      ctx.font = 'bold 52px monospace'
      ctx.fillStyle = '#010101'
      ctx.textAlign = 'center'
      ctx.fillText(runnerTag, PILL_X + PILL_W / 2, PILL_Y + 66)
      ctx.textAlign = 'left'

      ctx.font = '34px Arial, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText('My Runner Tag', PILL_X + PILL_W + 30, PILL_Y + 62)
    }

    // ── Bottom footer ──
    ctx.font = '36px Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillText('stride-web-frontend.vercel.app', 80, CANVAS_H - 80)

    // ── Download ──
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stride-story-${eventName.toLowerCase().replace(/\s+/g, '-')}.png`
      a.click()
      URL.revokeObjectURL(url)
      setGenerating(false)
    }, 'image/png')
  }

  return (
    <div className='mt-6'>
      <canvas ref={canvasRef} className='hidden' aria-hidden='true' />
      <button
        onClick={generate}
        disabled={generating}
        className='w-full flex items-center justify-center gap-2.5 bg-stride-yellow-accent text-copy-black font-bold py-4 rounded-xl hover:bg-stride-yellow-accent/90 active:scale-[0.98] transition-all disabled:opacity-60 text-base'
      >
        <Download size={18} />
        {generating ? 'Generating story…' : 'Download Instagram Story'}
      </button>
      <p className='text-white/25 text-xs text-center mt-2'>1080×1920 PNG — ready to share on Instagram Stories</p>
    </div>
  )
}
