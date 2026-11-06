// Builds the /join-slay Open Graph image — a tilted photo collage around a pink
// Slay card — and uploads it to Supabase Storage.
//
// JPEG, not WebP: link-preview scrapers (WhatsApp, LinkedIn, iMessage) decode
// WebP unevenly. 2400x1260 is 2x the 1200x630 OG size, so previews stay sharp
// on high-density screens; quality is tuned to keep the file under ~600 KB,
// above which WhatsApp tends to drop the preview image.
//
// Sources: the event photos in ~/Downloads/slay-picks (see
// optimize-slay-photos.mjs) and the keyed wordmark already in storage.
//
// Run:  node --env-file=.env.local scripts/build-slay-og.mjs
// Needs: NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY

import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.STRIDE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or STRIDE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const BUCKET = 'stride-assets'
const OUT_PATH = 'images/slay/og-join-slay.jpg'
const SRC_DIR = join(homedir(), 'Downloads', 'slay-picks')
const LOCAL_COPY = join(homedir(), 'Downloads', 'slay-picks', 'og-join-slay.jpg') // for eyeballing; not committed
const WORDMARK_URL = `${SUPABASE_URL}/storage/v1/object/public/stride-assets/images/logos/slay-wordmark-lime.webp?v=2`

const WIDTH = 2400
const HEIGHT = 1260
const QUALITY = 80

const INK = '#0B0A0B'
const PINK = '#E6358F'
const BORDER = 16

/** Photo tiles around the centre card: file, size, top-left position, tilt. */
const TILES = [
  { file: 'workshop-128.jpg', w: 560, h: 420, x: -40, y: -50, angle: -6 },
  { file: 'run-077.jpg', w: 520, h: 390, x: 470, y: -70, angle: 4 },
  { file: 'gym-416.jpg', w: 520, h: 390, x: 1410, y: -60, angle: -4 },
  { file: 'workshop-160.jpg', w: 560, h: 420, x: 1880, y: -40, angle: 6 },
  { file: 'run-030.jpg', w: 540, h: 405, x: -60, y: 430, angle: 5 },
  { file: 'workshop-185.jpg', w: 540, h: 405, x: 1900, y: 430, angle: -5 },
  { file: 'run-121.jpg', w: 580, h: 435, x: -20, y: 880, angle: -4 },
  { file: 'workshop-142.jpg', w: 500, h: 480, x: 500, y: 880, angle: 3 },
  { file: 'workshop-163.jpg', w: 560, h: 420, x: 1360, y: 900, angle: 5 },
  { file: 'run-145.jpg', w: 520, h: 440, x: 1900, y: 880, angle: -3 },
]

/** The centre card: pink, slightly tilted, wordmark over a tagline. */
const CARD = { w: 1120, h: 660, angle: -3 }

async function tile({ file, w, h, angle }) {
  const photo = await sharp(await readFile(join(SRC_DIR, file)))
    .rotate()
    .resize(w, h, { fit: 'cover', position: 'attention' })
    .extend({ top: BORDER, bottom: BORDER, left: BORDER, right: BORDER, background: '#FFFFFF' })
    .toBuffer()
  return sharp(photo).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
}

async function card() {
  const wordmark = Buffer.from(await (await fetch(WORDMARK_URL)).arrayBuffer())
  const logo = await sharp(wordmark).resize({ width: 640 }).png().toBuffer()
  const logoMeta = await sharp(logo).metadata()

  // A heavy system face for the tagline: librsvg cannot load the page's web font.
  const text = Buffer.from(`
    <svg width="${CARD.w}" height="${CARD.h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="48" fill="${PINK}" stroke="${INK}" stroke-width="10"/>
      <text x="50%" y="${CARD.h - 150}" text-anchor="middle" font-family="'Arial Black', 'Helvetica Neue', sans-serif"
            font-weight="900" font-size="82" fill="${INK}">SLAY EVERY MOVE.</text>
      <text x="50%" y="${CARD.h - 70}" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif"
            font-weight="700" font-size="34" fill="${INK}" letter-spacing="5">WOMEN-ONLY RUN CLUB · BENGALURU</text>
    </svg>`)

  const flat = await sharp(text)
    .composite([{ input: logo, left: Math.round((CARD.w - logoMeta.width) / 2), top: 70 }])
    .png()
    .toBuffer()
  return sharp(flat).rotate(CARD.angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
}

async function main() {
  const layers = []
  for (const t of TILES) layers.push({ input: await tile(t), left: t.x, top: t.y })

  const centre = await card()
  const { width, height } = await sharp(centre).metadata()
  layers.push({ input: centre, left: Math.round((WIDTH - width) / 2), top: Math.round((HEIGHT - height) / 2) })

  const out = await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: INK } })
    .composite(layers)
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer()

  await writeFile(LOCAL_COPY, out)

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(OUT_PATH, out, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' })
  if (error) throw error

  console.log(`ok  ${OUT_PATH}  ${WIDTH}x${HEIGHT}  ${(out.length / 1024).toFixed(0)} KB`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
