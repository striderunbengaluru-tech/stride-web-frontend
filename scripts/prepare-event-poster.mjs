// Make an event's poster safe to put in an email.
//
// The events bucket stores banners as WebP, which Gmail and Apple Mail render
// but Outlook on Windows does not — it would show a broken image in the hero.
// This takes an event's FIRST banner, converts it to JPEG at 2x the email's
// 560px column, and uploads it alongside the other email assets.
//
// Run:  node --env-file=.env.local scripts/prepare-event-poster.mjs <event-slug>
// Needs: NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY
//
// Prints the URL to drop into config.json as "posterUrl".

import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const SLUG = process.argv[2]
const BUCKET = 'stride-assets'
const WIDTH = 1120 // 2x the email's 560px content column
const QUALITY = 82

if (!SLUG) {
  console.error('Usage: node --env-file=.env.local scripts/prepare-event-poster.mjs <event-slug>')
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.STRIDE_SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or STRIDE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const { data: event, error: readError } = await supabase
  .from('events')
  .select('name, banner_images')
  .eq('slug', SLUG)
  .single()

if (readError || !event) {
  console.error(`No event with slug "${SLUG}"${readError ? `: ${readError.message}` : ''}`)
  process.exit(1)
}

let banners = []
try { banners = JSON.parse(event.banner_images ?? '[]') } catch { banners = [] }
if (banners.length === 0) {
  console.error(`"${event.name}" has no banner images.`)
  process.exit(1)
}

const source = banners[0]
const res = await fetch(source)
if (!res.ok) {
  console.error(`Could not fetch ${source} (${res.status})`)
  process.exit(1)
}

// `withoutEnlargement` so a small banner is not upscaled into mush.
const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
  .resize(WIDTH, null, { withoutEnlargement: true })
  .jpeg({ quality: QUALITY, progressive: true, chromaSubsampling: '4:4:4' })
  .toBuffer()

const key = `images/web-assets/email-posters/${SLUG}.jpg`
const { error: uploadError } = await supabase.storage.from(BUCKET).upload(key, jpeg, {
  contentType: 'image/jpeg',
  upsert: true,
})

if (uploadError) {
  console.error(`Upload failed: ${uploadError.message}`)
  process.exit(1)
}

const { width, height } = await sharp(jpeg).metadata()
console.log(`✓ ${event.name} · banner 1 of ${banners.length}`)
console.log(`  ${width}x${height} JPEG · ${(jpeg.length / 1024).toFixed(0)} KB`)
console.log(`\n  "posterUrl": "${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}"`)
