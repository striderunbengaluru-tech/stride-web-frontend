// One-off: recompress the newsroom photos (hero slideshow + press carousel)
// in place — same bucket, same paths, same URLs, so no code changes needed.
//
// Why: the originals total ~33 MB (newsroom-1.webp alone is 12.8 MB) and are
// served with `cache-control: no-cache` on the free plan, so every homepage
// view re-downloads them. They render at most full-viewport (~1920px), so a
// 1920px-wide WebP q80 is visually identical at a fraction of the size.
//
// Run:  node --env-file=.env.local scripts/optimize-newsroom-images.mjs [--backup-dir <dir>]
// Needs: NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY

import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

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

// Hero slideshow (newsroom-1..9) + press carousel extras (newsroom-10,
// article-newsroom-1). All render as large backgrounds / article cards.
const IMAGES = [
  ...Array.from({ length: 10 }, (_, i) => `newsroom-${i + 1}.webp`),
  'article-newsroom-1.webp',
]

const MAX_WIDTH = 1920
const QUALITY = 80

const backupFlag = process.argv.indexOf('--backup-dir')
const BACKUP_DIR = backupFlag !== -1 && process.argv[backupFlag + 1]
  ? process.argv[backupFlag + 1]
  : path.join(process.cwd(), '.newsroom-image-backups')

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

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

async function processImage(file) {
  const src = await download(file)
  await writeFile(path.join(BACKUP_DIR, file), src)

  const out = await sharp(src)
    .rotate() // honor EXIF orientation before stripping metadata
    .resize({ width: MAX_WIDTH, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5 })
    .toBuffer()

  if (out.length >= src.length) {
    console.log(`• ${file} (${kb(src.length)}) already optimal — skipped`)
    return { before: src.length, after: src.length }
  }

  const meta = await sharp(out).metadata()
  await upload(file, out)
  console.log(`✓ ${file} ${kb(src.length)} → ${kb(out.length)} (${meta.width}x${meta.height})`)
  return { before: src.length, after: out.length }
}

async function main() {
  await mkdir(BACKUP_DIR, { recursive: true })
  console.log(`Originals backed up to: ${BACKUP_DIR}\n`)

  let before = 0
  let after = 0
  for (const file of IMAGES) {
    const r = await processImage(file)
    before += r.before
    after += r.after
  }
  console.log(`\nTotal: ${kb(before)} → ${kb(after)} (${((1 - after / before) * 100).toFixed(0)}% smaller)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
