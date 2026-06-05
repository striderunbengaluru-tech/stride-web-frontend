// One-off: convert the Pokemon GO blog images (PNG/JPG) to WebP and re-upload them
// to the SAME storage directory with a 1-year immutable cache header.
//
// Why: the originals are ~10 MB of PNG/JPG served with `cache-control: no-cache`,
// so every page view re-downloads them from Supabase. WebP + long cache slashes
// both the per-fetch size and the number of repeat fetches.
//
// Run:  node --env-file=.env.local scripts/optimize-blog-images.mjs
// Needs: NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY

import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.STRIDE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or STRIDE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const BUCKET = 'stride-assets'
const DIR = 'images/blogs'
const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${DIR}`
const CACHE_CONTROL = '31536000' // 1 year

// Standard content images: cap longest side at 1200px (covers 3x retina at the
// ~400-520px display size) and convert to WebP q82.
const CONTENT_IMAGES = [
  'blog-pokemon-2.jpg', // hero cover
  'blog-pokemon-3.png',
  'blog-pokemon-4.png',
  'blog-pokemon-5.png',
  'blog-pokemon-6.png',
]

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const baseName = (file) => file.replace(/\.[^.]+$/, '')
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

async function download(file) {
  const res = await fetch(`${PUBLIC_BASE}/${file}`)
  if (!res.ok) throw new Error(`download ${file} → ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function upload(name, buf) {
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(`${DIR}/${name}`, buf, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: CACHE_CONTROL,
    })
  if (error) throw error
}

async function processContentImage(file) {
  const src = await download(file)
  const out = await sharp(src)
    .rotate() // honor EXIF orientation before stripping metadata
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer()
  const meta = await sharp(out).metadata()
  const name = `${baseName(file)}.webp`
  await upload(name, out)
  console.log(`✓ ${file} (${kb(src.length)}) → ${name} (${kb(out.length)}) ${meta.width}x${meta.height}`)
}

async function processOgImage() {
  const file = 'blog-pokemon-og.jpg'
  const src = await download(file)
  const out = await sharp(src)
    .rotate()
    .resize({ width: 1200, height: 630, fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer()
  await upload('blog-pokemon-og.webp', out)
  console.log(`✓ ${file} (${kb(src.length)}) → blog-pokemon-og.webp (${kb(out.length)}) 1200x630`)
}

async function main() {
  for (const file of CONTENT_IMAGES) await processContentImage(file)
  await processOgImage()
  console.log('\nDone. Update content refs to the .webp files.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
