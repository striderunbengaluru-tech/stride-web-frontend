// One-off: convert the Food Pharmer run photos to WebP and upload them to
// `images/blogs/` with a 1-year immutable cache header.
//
// The originals are iPhone HEIC files, which sharp's prebuilt libvips cannot
// decode, so convert them to JPEG first with macOS `sips`:
//   sips -s format jpeg -s formatOptions 95 "foodpharmer 1.HEIC" --out foodpharmer-1.jpg
//
// Run:  node --env-file=.env.local scripts/prepare-food-pharmer-blog-images.mjs <jpeg-dir>
// Needs: NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.STRIDE_SUPABASE_SERVICE_ROLE_KEY
const SOURCE_DIR = process.argv[2]

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or STRIDE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!SOURCE_DIR) {
  console.error('Usage: node --env-file=.env.local scripts/prepare-food-pharmer-blog-images.mjs <jpeg-dir>')
  process.exit(1)
}

const BUCKET = 'stride-assets'
const DIR = 'images/blogs'
const CACHE_CONTROL = '31536000' // 1 year

// [source file, destination name]. Same 1200px / WebP q82 contract as the
// other blog images.
const CONTENT_IMAGES = [
  ['foodpharmer-1.jpg', 'blog-food-pharmer-1.webp'],
  ['foodpharmer-2.jpg', 'blog-food-pharmer-2.webp'],
]

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

async function processContentImage([file, name]) {
  const src = await readFile(join(SOURCE_DIR, file))
  const out = await sharp(src)
    .rotate() // honor EXIF orientation before stripping metadata
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer()
  const meta = await sharp(out).metadata()
  const { error } = await admin.storage.from(BUCKET).upload(`${DIR}/${name}`, out, {
    contentType: 'image/webp',
    upsert: false,
    cacheControl: CACHE_CONTROL,
  })
  if (error) throw error
  console.log(`✓ ${file} (${kb(src.length)}) → ${name} (${kb(out.length)}) ${meta.width}x${meta.height}`)
}

async function main() {
  for (const entry of CONTENT_IMAGES) await processContentImage(entry)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
