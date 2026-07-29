// Utility — builds a 1080x1920 Instagram-Story-ready PNG of an event.
// Used by the confirmation page's Share button (see share-confirmation.tsx).
//
// Layout, top to bottom: purple background, Stride wordmark, "I AM ATTENDING"
// eyebrow, event name, date + location, a dashed zone for the sharer to drop
// Instagram's own link sticker on, then the event poster filling the full width
// between the side margins. No handle or URL — the link sticker replaces them,
// and no runner tag, which stays on the page itself.

const CANVAS_W = 1080
const CANVAS_H = 1920
const BRAND_PURPLE = '#4B2862'
const BRAND_PURPLE_DARK = '#2a1240'
const BRAND_YELLOW = '#E1D03F'
const PADDING = 80

// Dashed placeholder the sharer covers with Instagram's link sticker. Sized to
// its own label rather than the full content width, so it reads as a chip-shaped
// hint instead of a big empty box.
const STICKER_H = 64
const STICKER_PAD_X = 28
const STICKER_LABEL = 'ADD LINK STICKER'

// Leaves the poster clear of Instagram's own bottom chrome.
const BOTTOM_MARGIN = 70

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
  // The header is deliberately tight: every pixel saved up here goes to the
  // poster, which now has to fill the full content width.
  const logo = await loadImage(LOGO_URL)
  if (logo) {
    const logoW = 240
    const ratio = logo.naturalWidth ? logo.naturalHeight / logo.naturalWidth : 0.33
    ctx.drawImage(logo, PADDING, 90, logoW, logoW * ratio)
  }

  // ── Eyebrow ── (Geist Mono uppercase to match the brand system)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = BRAND_YELLOW
  ctx.font = `700 34px ${FONT_MONO}`
  // Geist Mono is already a wide monospace face, so keep tracking minimal —
  // extra letter-spacing here reads as gaps between every character.
  ctx.letterSpacing = '1px'
  // Baselines are spaced so there's clear air between the wordmark, the eyebrow
  // and the title — roughly 50px logo-to-eyebrow and 38px eyebrow-to-title once
  // cap heights and descenders are accounted for.
  ctx.fillText('I AM ATTENDING', PADDING, 246)
  ctx.letterSpacing = '0px'

  // ── Event name — title face (Libre Baskerville), wraps to max 2 lines ──
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 60px ${FONT_TITLE}`
  const nameLines = layoutWrappedText(ctx, opts.eventName, CANVAS_W - PADDING * 2, 2)
  let cursorY = 336
  for (const line of nameLines) {
    ctx.fillText(line, PADDING, cursorY)
    cursorY += 74
  }

  // ── Date + location ──
  cursorY += 8
  ctx.font = `500 38px ${FONT_BODY}`
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  if (opts.eventDate) {
    ctx.fillText(`📅  ${opts.eventDate}`, PADDING, cursorY)
    cursorY += 52
  }
  if (opts.eventLocation) {
    // Truncate location if very long
    let loc = opts.eventLocation
    while (ctx.measureText(`📍  ${loc}…`).width > CANVAS_W - PADDING * 2 && loc.length > 0) {
      loc = loc.slice(0, -1)
    }
    const locText = loc === opts.eventLocation ? loc : `${loc}…`
    ctx.fillText(`📍  ${locText}`, PADDING, cursorY)
    cursorY += 52
  }

  // ── Link-sticker zone — dashed placeholder the sharer drops Instagram's own
  //    link sticker onto. Kept low-contrast so it reads as a guide, not content,
  //    if someone posts without covering it. ──
  const STICKER_Y = cursorY + 26

  // Measure with the exact font + tracking the label is drawn with, so the box
  // hugs the text at any font fallback.
  ctx.save()
  ctx.font = `500 26px ${FONT_MONO}`
  ctx.letterSpacing = '2px'
  const stickerW = Math.round(ctx.measureText(STICKER_LABEL).width) + STICKER_PAD_X * 2

  ctx.setLineDash([14, 11])
  ctx.strokeStyle = 'rgba(255,255,255,0.34)'
  ctx.lineWidth = 3
  drawRoundedRect(ctx, PADDING, STICKER_Y, stickerW, STICKER_H, 18)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.42)'
  ctx.fillText(STICKER_LABEL, PADDING + stickerW / 2, STICKER_Y + STICKER_H / 2)
  ctx.restore()

  cursorY = STICKER_Y + STICKER_H

  // ── Event poster ──
  // The frame is sized from the poster's own aspect ratio rather than being a
  // fixed box the poster is fitted into. That means nothing is ever cropped and
  // there are no letterbox bars inside the frame either — the border hugs the
  // artwork. It grows upward from a fixed bottom edge, as large as the space
  // left under the sticker zone allows, and stays horizontally centred.
  const poster = opts.eventBannerUrl ? await loadImage(opts.eventBannerUrl) : null

  const MAX_FRAME_W = CANVAS_W - PADDING * 2
  const FRAME_BOTTOM = CANVAS_H - BOTTOM_MARGIN
  const AVAILABLE_H = FRAME_BOTTOM - (cursorY + 34)

  const aspect = poster?.naturalWidth && poster.naturalHeight
    ? poster.naturalWidth / poster.naturalHeight
    : 3 / 4 // admin crops posters to 3:4, so that's the sane fallback

  const FRAME_H = Math.min(AVAILABLE_H, MAX_FRAME_W / aspect)
  const FRAME_W = FRAME_H * aspect
  const FRAME_X = (CANVAS_W - FRAME_W) / 2
  const FRAME_Y = FRAME_BOTTOM - FRAME_H

  // Frame background (visible only if the poster failed to load)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  drawRoundedRect(ctx, FRAME_X, FRAME_Y, FRAME_W, FRAME_H, 32)
  ctx.fill()

  if (poster) {
    ctx.save()
    drawRoundedRect(ctx, FRAME_X, FRAME_Y, FRAME_W, FRAME_H, 32)
    ctx.clip()
    // Contain-fit. Because the frame was derived from this image's aspect it
    // fills exactly — no crop, no bars.
    const scale = Math.min(FRAME_W / poster.naturalWidth, FRAME_H / poster.naturalHeight)
    const drawW = poster.naturalWidth * scale
    const drawH = poster.naturalHeight * scale
    ctx.drawImage(
      poster,
      FRAME_X + (FRAME_W - drawW) / 2,
      FRAME_Y + (FRAME_H - drawH) / 2,
      drawW,
      drawH,
    )
    ctx.restore()
  }

  // Subtle border around the frame
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 2
  drawRoundedRect(ctx, FRAME_X, FRAME_Y, FRAME_W, FRAME_H, 32)
  ctx.stroke()

  return new Promise<Blob | null>(resolve => {
    canvas.toBlob(b => resolve(b), 'image/png')
  })
}
