// Compresses the hand-picked Slay Run Club photos and logos, uploads them to
// Supabase Storage, and writes their dimensions for the /join-slay page.
//
// Sources are the 2400px Drive renditions (not the ~19 MB camera originals),
// read from ~/Downloads/slay-picks/:
//   <set>-<nnn>.jpg   — event photos (set = gym | run | workshop)
//   logo-<n>-thumb.png — the four flat logo exports (art on a solid fill)
//
// Photos render at most ~720px wide (a full-bleed hero on a phone at 2x DPR,
// or a ~33vw card on desktop), so 1400px wide is already retina for every slot
// and keeps each file in the low hundreds of KB. `.rotate()` applies the EXIF
// orientation and sharp drops all other metadata by default — including GPS,
// which these phone and camera exports can carry.
//
// The logos arrive as RGB with no alpha: the art sits on a flat pink or lime
// square. The fill is keyed out to transparency so the mark can sit on any
// Slay surface, with a soft ramp so anti-aliased edges stay smooth.
//
// Run:  node --env-file=.env.local scripts/optimize-slay-photos.mjs
// Needs: NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY
//
// Writes src/content/slay-photos.json ({ name: [width, height] }), which
// src/content/slay-photos.ts types and pairs with alt text.

import { readdir, readFile, writeFile } from 'node:fs/promises'
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
const PHOTO_DIR = 'images/slay'
const LOGO_DIR = 'images/logos'
const CACHE_CONTROL = '31536000' // 1 year — filenames are stable

const SRC_DIR = join(homedir(), 'Downloads', 'slay-picks')
const MANIFEST = new URL('../src/content/slay-photos.json', import.meta.url)

const PHOTO_WIDTH = 1400
const PHOTO_QUALITY = 78
const LOGO_WIDTH = 640
const LOGO_QUALITY = 90

const PHOTO_PATTERN = /^(gym|run|workshop)-\d{3}\.jpg$/

/** Drive export → published name, and the fill colour to key out. */
const LOGOS = [
  { src: 'logo-8-thumb.png', name: 'slay-wordmark-lime.webp', fill: [0xe6, 0x35, 0x8f] },
  { src: 'logo-11-thumb.png', name: 'slay-wordmark-pink.webp', fill: [0xb6, 0xf3, 0x3b] },
  { src: 'logo-9-thumb.png', name: 'slay-bolt-lime.webp', fill: [0xe6, 0x35, 0x8f] },
  { src: 'logo-10-thumb.png', name: 'slay-bolt-pink.webp', fill: [0xb6, 0xf3, 0x3b] },
]

/** RGB distance below which a pixel is pure fill, and above which it is pure art. */
const KEY_INNER = 40
const KEY_OUTER = 120

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

async function upload(path, body) {
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, body, { contentType: 'image/webp', upsert: true, cacheControl: CACHE_CONTROL })
  if (error) throw error
}

async function processPhoto(file) {
  const src = await readFile(join(SRC_DIR, file))
  const { data, info } = await sharp(src)
    .rotate()
    .resize({ width: PHOTO_WIDTH, withoutEnlargement: true })
    .webp({ quality: PHOTO_QUALITY, effort: 6 })
    .toBuffer({ resolveWithObject: true })

  const name = file.replace(/\.jpg$/, '')
  await upload(`${PHOTO_DIR}/${name}.webp`, data)
  console.log(`  ok  ${name.padEnd(14)} ${kb(src.length)} -> ${kb(data.length)}  ${info.width}x${info.height}`)
  return { name, width: info.width, height: info.height, bytes: data.length }
}

async function processLogo({ src, name, fill }) {
  const { data, info } = await sharp(await readFile(join(SRC_DIR, src)))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const distance = Math.hypot(data[i] - fill[0], data[i + 1] - fill[1], data[i + 2] - fill[2])
    const ramp = (distance - KEY_INNER) / (KEY_OUTER - KEY_INNER)
    data[i + 3] = Math.round(255 * Math.min(Math.max(ramp, 0), 1))
  }

  const out = await sharp(data, { raw: info })
    .trim({ threshold: 1 })
    .resize({ width: LOGO_WIDTH, withoutEnlargement: true })
    .webp({ quality: LOGO_QUALITY, alphaQuality: 100, effort: 6 })
    .toBuffer()

  await upload(`${LOGO_DIR}/${name}`, out)
  console.log(`  ok  ${name.padEnd(26)} ${kb(out.length)}`)
}

async function main() {
  const files = (await readdir(SRC_DIR)).filter((f) => PHOTO_PATTERN.test(f)).sort()
  const manifest = {}
  let total = 0

  for (const file of files) {
    const { name, width, height, bytes } = await processPhoto(file)
    manifest[name] = [width, height]
    total += bytes
  }
  for (const logo of LOGOS) await processLogo(logo)

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`\n${files.length} photos -> ${PHOTO_DIR}/ (${kb(total)} total), ${LOGOS.length} logos -> ${LOGO_DIR}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
