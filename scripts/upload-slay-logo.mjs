// Uploads the Slay wordmark used in the masthead of Slay's paper-sheet emails.
//
// PNG, not WebP: Outlook on Windows cannot decode WebP. The source is the pink
// wordmark already keyed to transparency by optimize-slay-photos.mjs, so this
// only re-encodes it at email size (2x a ~180px slot) and stores it next to the
// other email icons.
//
// Run:  node --env-file=.env.local scripts/upload-slay-logo.mjs
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
const SOURCE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/images/logos/slay-wordmark-pink.webp?v=2`
const OUT_PATH = 'images/web-assets/email-icons/slay-wordmark-pink.png'
const WIDTH = 400

const res = await fetch(SOURCE)
if (!res.ok) throw new Error(`Could not fetch the keyed wordmark (${res.status})`)

const png = await sharp(Buffer.from(await res.arrayBuffer()))
  .resize({ width: WIDTH })
  .png({ compressionLevel: 9, palette: true })
  .toBuffer()

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const { error } = await admin.storage
  .from(BUCKET)
  .upload(OUT_PATH, png, { contentType: 'image/png', upsert: true, cacheControl: '31536000' })
if (error) throw error

console.log(`ok  ${OUT_PATH}  ${(png.length / 1024).toFixed(0)} KB`)
