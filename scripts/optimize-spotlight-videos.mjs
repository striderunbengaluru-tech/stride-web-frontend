// One-off: compress the 4 homepage spotlight videos and generate a lightweight
// WebP poster frame for each, then re-upload everything with a 1-year immutable
// cache header.
//
// Why: the originals are 12-26 MB each (~80 MB total), encoded far larger than the
// ~320px portrait frame they display in, and served with `cache-control: no-cache`.
// Re-encoding to ~720p + poster + click-to-play (preload="none") means only a few
// MB leave Supabase, and only when a viewer actually taps play.
//
// Requires ffmpeg on PATH (brew install ffmpeg).
// Run:  node --env-file=.env.local scripts/optimize-spotlight-videos.mjs
// Needs: NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const execFileAsync = promisify(execFile)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.STRIDE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or STRIDE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const BUCKET = 'stride-assets'
const VIDEO_DIR = 'videos/spotlight'
const POSTER_DIR = 'images/spotlight-posters'
const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`
const CACHE_CONTROL = '31536000' // 1 year

// videoFile = existing object name; slug = poster filename (matches spotlights.ts)
const VIDEOS = [
  { videoFile: 'spotlight-stride-like-a-woman.mp4', slug: 'stride-like-a-woman' },
  { videoFile: 'spotlight-bakery-hop.mp4', slug: 'bakery-hop' },
  { videoFile: 'spotlight-mothers-day.mp4', slug: 'mothers-day' },
  { videoFile: 'spotlight-vagisha.mp4', slug: 'vagisha' },
]

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

async function download(path, dest) {
  const res = await fetch(`${PUBLIC_BASE}/${path}`)
  if (!res.ok) throw new Error(`download ${path} → ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
  return buf.length
}

async function upload(path, buf, contentType) {
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType, upsert: true, cacheControl: CACHE_CONTROL })
  if (error) throw error
}

async function processVideo({ videoFile, slug }, work) {
  const inPath = join(work, videoFile)
  const outPath = join(work, `out-${videoFile}`)
  const framePath = join(work, `frame-${slug}.png`)

  const srcBytes = await download(`${VIDEO_DIR}/${videoFile}`, inPath)

  // Re-encode: scale to 540px wide (even height) — ample for the ~320px CSS portrait
  // frame even on retina — H.264 CRF 28, AAC 96k, faststart.
  await execFileAsync('ffmpeg', [
    '-y', '-i', inPath,
    '-vf', 'scale=540:-2',
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '28',
    '-c:a', 'aac', '-b:a', '96k',
    '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
    outPath,
  ])
  const outBuf = await readFile(outPath)

  // Poster: grab a frame ~1s in, convert to WebP.
  await execFileAsync('ffmpeg', ['-y', '-ss', '00:00:01', '-i', inPath, '-frames:v', '1', '-q:v', '2', framePath])
  const posterBuf = await sharp(await readFile(framePath)).resize({ width: 640 }).webp({ quality: 80 }).toBuffer()

  await upload(`${VIDEO_DIR}/${videoFile}`, outBuf, 'video/mp4')
  await upload(`${POSTER_DIR}/${slug}.webp`, posterBuf, 'image/webp')

  console.log(`✓ ${videoFile}: ${mb(srcBytes)} → ${mb(outBuf.length)} | poster ${slug}.webp (${kb(posterBuf.length)})`)
}

async function main() {
  const work = await mkdtemp(join(tmpdir(), 'spotlight-'))
  try {
    for (const v of VIDEOS) await processVideo(v, work)
    console.log('\nDone. Posters live at images/spotlight-posters/<slug>.webp')
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
