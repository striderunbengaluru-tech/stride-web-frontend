// One-off: generate and upload the PNG assets the transactional emails need to
// survive Gmail/Apple Mail dark mode and to show social icons.
//
//   1. email-bg-purple.png  — solid #4B2862 tile used as the email CANVAS
//      background image. Gmail dark mode recolors background-COLORS but never
//      background-IMAGES, so painting the purple as an image makes the canvas
//      immune to inversion.
//   2. email-bg-card.png    — solid #5B3A73 tile for the glass cards (same trick).
//   3. instagram.png / strava.png — PNG rasterizations of the site's brand
//      glyphs (Gmail strips inline SVG), tinted footer-muted, for the footer.
//
// Run:  node --env-file=.env.local scripts/upload-email-assets.mjs
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
const CACHE_CONTROL = '31536000' // 1 year — these assets never change

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Neutral mid-grey so the social glyphs read on BOTH a light (white) and a dark
// canvas — the email no longer has a fixed background, and PNGs don't invert.
const ICON_COLOR = '#8A8A8A'

// Single-path brand glyphs copied from src/components/ui/brand-icons.tsx.
const INSTAGRAM_PATH =
  'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z'
const STRAVA_PATH =
  'M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169'

const svgIcon = (path) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48"><path fill="${ICON_COLOR}" d="${path}"/></svg>`

async function upload(path, buf) {
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: 'image/png', upsert: true, cacheControl: CACHE_CONTROL })
  if (error) throw error
  console.log(`✓ ${path}`)
}

async function solidTile(hex) {
  return sharp({ create: { width: 120, height: 120, channels: 4, background: hex } }).png().toBuffer()
}

async function iconPng(path) {
  return sharp(Buffer.from(svgIcon(path))).resize(48, 48).png().toBuffer()
}

async function main() {
  await upload('images/web-assets/email-bg-purple.png', await solidTile('#4B2862'))
  await upload('images/web-assets/email-bg-card.png', await solidTile('#5B3A73'))
  await upload('images/web-assets/email-icons/instagram.png', await iconPng(INSTAGRAM_PATH))
  await upload('images/web-assets/email-icons/strava.png', await iconPng(STRAVA_PATH))
  console.log('\nDone. Reference these URLs in src/lib/email/templates.ts.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
