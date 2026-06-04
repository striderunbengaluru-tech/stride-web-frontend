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

// The Stride wordmark logo (same SVG used in the navbar/footer).
const LOGO_URL = '/assets/images/stride-logo-color-transparent.svg'

// Fallback stacks if the site fonts haven't loaded; the real families
// (resolved from the page's CSS variables at draw time) match the website.
const FALLBACK_BODY = 'system-ui, -apple-system, "Segoe UI", sans-serif'
const FALLBACK_MONO = 'ui-monospace, "SF Mono", Menlo, monospace'
const FALLBACK_TITLE = 'Georgia, "Times New Roman", serif'

// Read a CSS custom property (e.g. `--font-figtree`) off the live document so
// the canvas uses the exact same font families as the rendered site.
function cssFont(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.body).getPropertyValue(varName).trim()
  return v ? `${v}, ${fallback}` : fallback
}

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

  // Match the website's typography: Libre Baskerville (titles), Figtree (body),
  // Geist Mono (eyebrow). Wait for the page fonts so canvas doesn't fall back.
  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready } catch { /* ignore */ }
  const FONT_TITLE = cssFont('--font-libre-baskerville', FALLBACK_TITLE)
  const FONT_BODY = cssFont('--font-figtree', FALLBACK_BODY)
  const FONT_MONO = cssFont('--font-geist-mono', FALLBACK_MONO)

  // ── Background — subtle vertical purple gradient ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  bgGrad.addColorStop(0, BRAND_PURPLE_DARK)
  bgGrad.addColorStop(0.5, BRAND_PURPLE)
  bgGrad.addColorStop(1, BRAND_PURPLE_DARK)
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // ── Brand block — Stride wordmark (SVG) top-left ──
  const logo = await loadImage(LOGO_URL)
  if (logo) {
    const logoW = 300
    const ratio = logo.naturalWidth ? logo.naturalHeight / logo.naturalWidth : 0.33
    ctx.drawImage(logo, PADDING, 120, logoW, logoW * ratio)
  }

  // ── Eyebrow ── (Geist Mono uppercase to match the brand system)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = BRAND_YELLOW
  ctx.font = `700 34px ${FONT_MONO}`
  // Geist Mono is already a wide monospace face, so keep tracking minimal —
  // extra letter-spacing here reads as gaps between every character.
  ctx.letterSpacing = '1px'
  ctx.fillText('I AM ATTENDING', PADDING, 320)
  ctx.letterSpacing = '0px'

  // ── Event name — title face (Libre Baskerville), wraps to max 2 lines ──
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 76px ${FONT_TITLE}`
  const nameLines = layoutWrappedText(ctx, opts.eventName, CANVAS_W - PADDING * 2, 2)
  let cursorY = 410
  for (const line of nameLines) {
    ctx.fillText(line, PADDING, cursorY)
    cursorY += 96
  }

  // ── Date + location ──
  cursorY += 12
  ctx.font = `500 40px ${FONT_BODY}`
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
      // Contain-fit — the whole poster stays visible inside the bounded frame
      // (no cropping); the rounded frame acts as the bounding box.
      const scale = Math.min(FRAME_W / img.naturalWidth, FRAME_H / img.naturalHeight)
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

  // ── Footer — handle + URL (Geist Mono, matching the site's mono labels) ──
  ctx.fillStyle = BRAND_YELLOW
  ctx.font = `700 34px ${FONT_MONO}`
  ctx.fillText(STRIDE_HANDLE, PADDING, 1780)

  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = `500 28px ${FONT_MONO}`
  ctx.fillText(`${SITE_HOST}/events/${opts.eventSlug}`, PADDING, 1830)

  return new Promise<Blob | null>(resolve => {
    canvas.toBlob(b => resolve(b), 'image/png')
  })
}
