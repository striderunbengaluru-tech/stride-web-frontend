// One-off: convert the partnership "See it for yourself" reel thumbnails (JPG) to
// WebP and re-upload to the SAME storage directory with a 1-year cache header.
//
// Run:  node --env-file=.env.local scripts/optimize-partnership-thumbs.mjs
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
const DIR = 'images/web-assets'
const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${DIR}`
const CACHE_CONTROL = '31536000' // 1 year

// Portrait reel thumbnails shown in a 420px-tall card (~330px wide desktop / full
// mobile width). Cap longest side at 800px for retina, WebP q82.
const THUMBS = [
  'fuaark-insta-thumb.jpg',
  'peakst8-insta-thumb.jpg',
  'puma-hyrox-insta-thumb.jpg',
  'zepto-insta-thumb.jpg',
  'neeraj-insta-thumb.jpg',
]

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const baseName = (file) => file.replace(/\.[^.]+$/, '')
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

async function processThumb(file) {
  const res = await fetch(`${PUBLIC_BASE}/${file}`)
  if (!res.ok) throw new Error(`download ${file} → ${res.status}`)
  const src = Buffer.from(await res.arrayBuffer())

  const out = await sharp(src)
    .rotate()
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer()

  const name = `${baseName(file)}.webp`
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(`${DIR}/${name}`, out, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: CACHE_CONTROL,
    })
  if (error) throw error
  console.log(`✓ ${file} (${kb(src.length)}) → ${name} (${kb(out.length)})`)
}

async function main() {
  for (const file of THUMBS) await processThumb(file)
  console.log('\nDone. Update partners-data / page refs to the .webp files.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
