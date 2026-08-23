// One-off: convert the KYRO territory-run photos (large iPhone/DSLR JPEGs, 4-10 MB
// each) to WebP and upload them to `images/blogs/` with a 1-year immutable cache
// header.
//
// Same contract as `optimize-blog-images.mjs`, but the source is local files
// rather than objects already sitting in the bucket — these were never uploaded
// at full size, so there is nothing to download and replace.
//
// Run:  node --env-file=.env.local scripts/prepare-kyro-blog-images.mjs
// Needs: NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY

import { readFile } from 'node:fs/promises'
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
const DIR = 'images/blogs'
const CACHE_CONTROL = '31536000' // 1 year
const SOURCE_DIR = join(homedir(), 'Downloads')

// [source file, destination name]. Longest side capped at 1200px (3x retina at
// the ~400-520px render size the blog uses) and converted to WebP q82.
const CONTENT_IMAGES = [
  ['kyro-1.JPG', 'blog-kyro-1.webp'],
  ['kyro-2.JPG', 'blog-kyro-2.webp'],
  ['kyro-3.JPG', 'blog-kyro-3.webp'],
  ['kyro-4.JPG', 'blog-kyro-4.webp'],
]

// The OG card is a fixed 1200x630 cover crop of the group shot.
const OG_SOURCE = 'kyro-1.JPG'
const OG_NAME = 'blog-kyro-og.webp'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

async function upload(name, buf) {
  const { error } = await admin.storage.from(BUCKET).upload(`${DIR}/${name}`, buf, {
    contentType: 'image/webp',
    upsert: true,
    cacheControl: CACHE_CONTROL,
  })
  if (error) throw error
}

async function processContentImage([file, name]) {
  const src = await readFile(join(SOURCE_DIR, file))
  const out = await sharp(src)
    .rotate() // honor EXIF orientation before stripping metadata
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer()
  const meta = await sharp(out).metadata()
  await upload(name, out)
  console.log(`✓ ${file} (${kb(src.length)}) → ${name} (${kb(out.length)}) ${meta.width}x${meta.height}`)
}

async function processOgImage() {
  const src = await readFile(join(SOURCE_DIR, OG_SOURCE))
  const out = await sharp(src)
    .rotate()
    .resize({ width: 1200, height: 630, fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer()
  await upload(OG_NAME, out)
  console.log(`✓ ${OG_SOURCE} (${kb(src.length)}) → ${OG_NAME} (${kb(out.length)}) 1200x630`)
}

async function main() {
  for (const entry of CONTENT_IMAGES) await processContentImage(entry)
  await processOgImage()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
