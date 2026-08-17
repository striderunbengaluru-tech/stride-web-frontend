// Compresses the Lead Strider portraits and uploads them to Supabase Storage.
//
// The source exports are ~9072x12097 (110 megapixels) — that resolution, not the
// format, is why each file is 2.5-3.5 MB despite already being WebP. They render
// at most ~420px wide (22vw gallery column on a 1920px screen), so 900px wide is
// already 2x retina for every slot on the page.
//
// Their alpha channel is ~99.9% opaque: the backgrounds are composited in
// already. It is flattened against the brand purple rather than dropped, so the
// handful of semi-transparent edge pixels land on the page background colour
// instead of turning black.
//
// Run:  node --env-file=.env.local scripts/optimize-team-photos.mjs
// One person only, when a portrait is re-shot:
//       node --env-file=.env.local scripts/optimize-team-photos.mjs --only=kushagra
// Needs: NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY
//
// Add new poses by extending POSES — sources are read from ~/Downloads.
//
// Re-uploading overwrites the same object path, so the public URL does not
// change. That URL is served `immutable` with a 1-year max-age and Next's image
// optimizer caches its own variants for 31 days, so a replaced portrait will NOT
// reach browsers that already hold the old one. See the note printed at the end.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
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
const DIR = 'images/team'
const CACHE_CONTROL = '31536000' // 1 year — filenames are stable, content is not

/** Page background, used to flatten stray transparent edge pixels. */
const BRAND_PURPLE = '#4B2862'

/** 3:4, matching the source ratio exactly, so nothing is cropped. */
const TARGET_WIDTH = 900
const TARGET_HEIGHT = 1200
const QUALITY = 82

const SRC_DIR = join(homedir(), 'Downloads')
const OUT_DIR = new URL('./webp/team/', import.meta.url)

const SLUGS = [
  'chethan',
  'ichita',
  'janvi',
  'kushagra',
  'naman',
  'sanches',
  'sidharth',
  'vagisha',
]

/** Pose suffixes to process. */
const POSES = ['pose-1', 'pose-2', 'pose-3']

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`
const mb = (bytes) => `${(bytes / 1048576).toFixed(2)} MB`

async function processOne(name) {
  const src = await readFile(join(SRC_DIR, name))

  const out = await sharp(src)
    .rotate() // honour EXIF orientation before resizing
    .flatten({ background: BRAND_PURPLE })
    .resize({
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
      fit: 'cover',
      withoutEnlargement: true,
    })
    .webp({ quality: QUALITY, effort: 6 })
    .toBuffer()

  await writeFile(new URL(name, OUT_DIR), out)

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(`${DIR}/${name}`, out, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: CACHE_CONTROL,
    })
  if (error) throw error

  const saved = ((1 - out.length / src.length) * 100).toFixed(1)
  console.log(`  ok  ${name.padEnd(26)} ${mb(src.length)} -> ${kb(out.length)}  (-${saved}%)`)
  return { src: src.length, out: out.length }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  // `--only=slug[,slug]` limits the run to specific people, so re-shooting one
  // portrait does not re-upload the other seven.
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))
  const only = onlyArg ? onlyArg.slice('--only='.length).split(',') : null
  if (only) {
    const unknown = only.filter((s) => !SLUGS.includes(s))
    if (unknown.length) {
      console.error(`Unknown slug(s): ${unknown.join(', ')}\nKnown: ${SLUGS.join(', ')}`)
      process.exit(1)
    }
  }
  const slugs = only ?? SLUGS

  // `--poses=pose-2` limits the run to specific poses, so adding a new pose does
  // not re-upload the ones already in storage.
  const posesArg = process.argv.find((a) => a.startsWith('--poses='))
  const posesOnly = posesArg ? posesArg.slice('--poses='.length).split(',') : null
  if (posesOnly) {
    const unknown = posesOnly.filter((p) => !POSES.includes(p))
    if (unknown.length) {
      console.error(`Unknown pose(s): ${unknown.join(', ')}\nKnown: ${POSES.join(', ')}`)
      process.exit(1)
    }
  }
  const poses = posesOnly ?? POSES

  const names = slugs.flatMap((slug) => poses.map((pose) => `${slug}-${pose}.webp`))
  let srcTotal = 0
  let outTotal = 0
  const failed = []

  for (const name of names) {
    try {
      const { src, out } = await processOne(name)
      srcTotal += src
      outTotal += out
    } catch (err) {
      failed.push([name, err.message])
      console.error(`  FAIL ${name}: ${err.message}`)
    }
  }

  console.log(
    `\n${names.length - failed.length}/${names.length} uploaded to ${DIR}/  ` +
      `${mb(srcTotal)} -> ${kb(outTotal)}`
  )
  if (only) {
    console.log(
      '\nReplaced an existing portrait at the same URL. Browsers and the Next\n' +
        'image optimizer may still hold the old bytes:\n' +
        '  local  — rm -rf .next/cache/images, then restart dev\n' +
        '  prod   — the URL is `immutable` for a year; if the old photo persists\n' +
        '           after deploy, rename the file (e.g. -pose-1b) and update\n' +
        '           src/content/lead-striders.json, which changes the URL.'
    )
  }
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
