// One-off: downscale the five milestone tier badges in place.
//
// The artwork was uploaded at 3762x3762 (0.7-1.7 MB each, ~6.7 MB total) but
// renders between 16px and 56px. next/image already shields visitors — it serves
// a ~3 KB resized variant — but every *new* variant still pulls the full-size
// original from Supabase Storage, which the free plan serves `no-cache`. This
// re-encodes them at 512px (still ~4.5x the largest 2x render, so visually
// lossless) and overwrites the same paths, so no code has to change.
//
// Run:  node --env-file=.env.local scripts/optimize-tier-badges.mjs [--dry-run]
// Needs: NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY

import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'fs'

const DRY_RUN = process.argv.includes('--dry-run')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.STRIDE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || (!DRY_RUN && !SERVICE_KEY)) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or STRIDE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const BUCKET = 'stride-assets'
const DIR = 'images/web-assets'
const EDGE = 512
const QUALITY = 90
const CACHE_CONTROL = '31536000'
const BACKUP_DIR = process.env.BADGE_BACKUP_DIR ?? './.badge-backups'

const FILES = [
  'tier-1-duckling-badge.webp',
  'tier-2-strider-badge.webp',
  'tier-3-stride-athlete-badge.webp',
  'tier-4-stride-pro-athlete-badge.webp',
  'tier-5-stride-legend-badge.webp',
]

const publicUrl = (name) =>
  `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${DIR}/${name}`

const kb = (n) => `${(n / 1024).toFixed(0)} KB`

mkdirSync(BACKUP_DIR, { recursive: true })

const admin = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

let before = 0
let after = 0

for (const name of FILES) {
  const res = await fetch(`${publicUrl(name)}?cb=${Date.now()}`)
  if (!res.ok) {
    console.error(`✗ ${name}: fetch failed (${res.status})`)
    process.exit(1)
  }
  const original = Buffer.from(await res.arrayBuffer())
  const meta = await sharp(original).metadata()

  // Keep the original bytes on disk — the upload overwrites the only remote copy.
  writeFileSync(`${BACKUP_DIR}/${name}`, original)

  const resized = await sharp(original)
    .resize(EDGE, EDGE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6, alphaQuality: 100 })
    .toBuffer()
  const outMeta = await sharp(resized).metadata()

  before += original.length
  after += resized.length

  const pct = (100 - (resized.length / original.length) * 100).toFixed(1)
  console.log(
    `${name.padEnd(40)} ${meta.width}x${meta.height} ${kb(original.length).padStart(8)}` +
    `  ->  ${outMeta.width}x${outMeta.height} ${kb(resized.length).padStart(7)}  (-${pct}%)` +
    `  alpha:${!!outMeta.hasAlpha}`
  )

  if (!DRY_RUN) {
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(`${DIR}/${name}`, resized, {
        contentType: 'image/webp',
        cacheControl: CACHE_CONTROL,
        upsert: true,
      })
    if (error) {
      console.error(`✗ ${name}: upload failed — ${error.message}`)
      process.exit(1)
    }
  }
}

console.log(
  `\n${DRY_RUN ? '[dry run] ' : '✓ uploaded · '}` +
  `total ${kb(before)} -> ${kb(after)} (-${(100 - (after / before) * 100).toFixed(1)}%)` +
  `\noriginals backed up to ${BACKUP_DIR}`
)
