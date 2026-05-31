// Utility — builds a 1080x1920 Instagram-Story-ready PNG of an event.
// Used by the confirmation page's Share button (see share-confirmation.tsx).
//
// Layout: pure purple background, event image bounded in a rounded frame in
// the lower half (no gradient overlay), big event name + date + location in
// the upper half, Stride handle + URL at the bottom. No runner tag here —
// that stays on the page itself.

const CANVAS_W = 1080
const CANVAS_H = 1920
const BRAND_PURPLE = '#4B2862'
const BRAND_PURPLE_DARK = '#2a1240'
const BRAND_YELLOW = '#E1D03F'
const PADDING = 80

const SITE_HOST = 'strideclub.in'
const STRIDE_HANDLE = '@stride_runclub_bengaluru'

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

// Word-wrap text into up to `maxLines` lines, ellipsing the last one if it overflows.
function layoutWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (let i = 0; i < words.length; i++) {
    const candidate = current ? `${current} ${words[i]}` : words[i]
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current)
      current = words[i]
      if (lines.length === maxLines - 1) {
        // Last line: include the rest, ellipse if it overflows
        let rest = words.slice(i).join(' ')
        while (rest.length > 0 && ctx.measureText(rest + '…').width > maxWidth) {
          rest = rest.slice(0, -1)
        }
        lines.push(rest + (rest === words.slice(i).join(' ') ? '' : '…'))
        return lines
      }
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export async function buildStoryCanvas(opts: {
  eventName: string
  eventDate: string | null     // already formatted, e.g. "Sat, 28 Jun · 7:15 AM"
  eventLocation: string | null
  eventBannerUrl: string | null
  eventSlug: string
}): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // ── Background — subtle vertical purple gradient ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  bgGrad.addColorStop(0, BRAND_PURPLE_DARK)
  bgGrad.addColorStop(0.5, BRAND_PURPLE)
  bgGrad.addColorStop(1, BRAND_PURPLE_DARK)
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // ── Brand block — STRIDE wordmark top-left ──
  const brandY = 140
  ctx.fillStyle = BRAND_YELLOW
  ctx.font = `900 60px ${FONT_STACK}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('STRIDE', PADDING, brandY)

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = `500 30px ${FONT_STACK}`
  ctx.fillText('Run Club · Bengaluru', PADDING, brandY + 44)

  // ── Eyebrow ──
  ctx.fillStyle = BRAND_YELLOW
  ctx.font = `700 34px ${FONT_STACK}`
  ctx.letterSpacing = '4px'
  ctx.fillText("I'M ATTENDING THIS RUN", PADDING, 320)
  ctx.letterSpacing = '0px'

  // ── Event name — bold, wraps to max 2 lines ──
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `800 80px ${FONT_STACK}`
  const nameLines = layoutWrappedText(ctx, opts.eventName, CANVAS_W - PADDING * 2, 2)
  let cursorY = 410
  for (const line of nameLines) {
    ctx.fillText(line, PADDING, cursorY)
    cursorY += 96
  }

  // ── Date + location ──
  cursorY += 12
  ctx.font = `500 40px ${FONT_STACK}`
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  if (opts.eventDate) {
    ctx.fillText(`📅  ${opts.eventDate}`, PADDING, cursorY)
    cursorY += 62
  }
  if (opts.eventLocation) {
    // Truncate location if very long
    let loc = opts.eventLocation
    while (ctx.measureText(`📍  ${loc}…`).width > CANVAS_W - PADDING * 2 && loc.length > 0) {
      loc = loc.slice(0, -1)
    }
    const locText = loc === opts.eventLocation ? loc : `${loc}…`
    ctx.fillText(`📍  ${locText}`, PADDING, cursorY)
    cursorY += 62
  }

  // ── Event banner image — bounded rounded frame in the lower half ──
  const FRAME_X = PADDING
  const FRAME_W = CANVAS_W - PADDING * 2
  const FRAME_Y = Math.max(cursorY + 40, 880)
  const FRAME_H = 1700 - FRAME_Y // ends ~1700, leaving room for handle/URL footer

  // Frame background (in case image fails to load)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  drawRoundedRect(ctx, FRAME_X, FRAME_Y, FRAME_W, FRAME_H, 32)
  ctx.fill()

  if (opts.eventBannerUrl) {
    const img = await loadImage(opts.eventBannerUrl)
    if (img) {
      ctx.save()
      drawRoundedRect(ctx, FRAME_X, FRAME_Y, FRAME_W, FRAME_H, 32)
      ctx.clip()
      // Cover-fit
      const scale = Math.max(FRAME_W / img.naturalWidth, FRAME_H / img.naturalHeight)
      const drawW = img.naturalWidth * scale
      const drawH = img.naturalHeight * scale
      const drawX = FRAME_X + (FRAME_W - drawW) / 2
      const drawY = FRAME_Y + (FRAME_H - drawH) / 2
      ctx.drawImage(img, drawX, drawY, drawW, drawH)
      ctx.restore()
    }
  }

  // Subtle border around the frame
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 2
  drawRoundedRect(ctx, FRAME_X, FRAME_Y, FRAME_W, FRAME_H, 32)
  ctx.stroke()

  // ── Footer — handle + URL ──
  ctx.fillStyle = BRAND_YELLOW
  ctx.font = `700 36px ${FONT_STACK}`
  ctx.fillText(STRIDE_HANDLE, PADDING, 1780)

  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = `500 30px ${FONT_STACK}`
  ctx.fillText(`${SITE_HOST}/events/${opts.eventSlug}`, PADDING, 1830)

  return new Promise<Blob | null>(resolve => {
    canvas.toBlob(b => resolve(b), 'image/png')
  })
}
