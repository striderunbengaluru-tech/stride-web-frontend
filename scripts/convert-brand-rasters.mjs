// The Stride logo, the reel-chip logos and the Razorpay icon are also Figma
// "SVG" exports that only wrap a base64 PNG — same iOS Safari black-box bug as
// the partner logos. Extract the raster and re-encode it properly.
//
// Run with: node scripts/convert-brand-rasters.mjs
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const REMOTE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images';
const OUT = new URL('./webp/', import.meta.url);

/** WebP for on-page rendering, PNG where a consumer needs broad format support. */
const JOBS = [
  { src: `${REMOTE}/logos/stride-logo-color-transparent.svg`, out: 'stride-logo-color-transparent', width: 720, png: true },
  { src: `${REMOTE}/logos/peakst8-logo.svg`, out: 'peakst8-logo', width: 480 },
  { src: `${REMOTE}/logos/puma-hyrox-logo.svg`, out: 'puma-hyrox-logo', width: 480 },
  { src: `${REMOTE}/web-assets/razorpay-full-icon.svg`, out: 'razorpay-full-icon', width: 480 },
];

await mkdir(OUT, { recursive: true });

async function load(src) {
  if (src.startsWith('http')) return fetch(src).then((r) => r.text());
  return readFile(src, 'utf8');
}

for (const job of JOBS) {
  const svg = await load(job.src);
  const m = svg.match(/data:image\/\w+;base64,([A-Za-z0-9+/=]+)/);
  if (!m) {
    console.log(`${job.out.padEnd(34)} true vector — skipped`);
    continue;
  }

  const raw = Buffer.from(m[1], 'base64');
  const base = sharp(raw)
    .trim({ threshold: 8 })
    .resize({ width: job.width, fit: 'inside', withoutEnlargement: true });

  const webp = await base.clone().webp({ quality: 90, effort: 6 }).toBuffer();
  await writeFile(new URL(`${job.out}.webp`, OUT), webp);

  let pngNote = '';
  if (job.png) {
    const png = await base.clone().png({ compressionLevel: 9, palette: true }).toBuffer();
    await writeFile(new URL(`${job.out}.png`, OUT), png);
    pngNote = ` + ${(png.byteLength / 1024).toFixed(1)} KiB png`;
  }

  console.log(
    `${job.out.padEnd(34)} ${(Buffer.byteLength(svg) / 1024).toFixed(0).padStart(5)} KiB -> ${(webp.byteLength / 1024).toFixed(1)} KiB webp${pngNote}`
  );
}
