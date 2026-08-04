// Extract the base64 raster hidden inside each Figma-exported "SVG" logo and
// re-encode it as a real WebP sized for the tile it renders in.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos';
const OUT = new URL('./webp/', import.meta.url);

const NAMES = `puma-logo under-armour-logo reebok-logo boldfit-logo tenxu-logo decathlon-logo fuaark-logo the-bear-house-logo
lifenjam-logo dizzy-duck-logo red-bull-logo third-wave-coffee-logo social-logo mccafe-logo tim-hortons-logo one8-commune-logo
paper-n-pie-logo flax-cafe-logo suzyq-logo amadora-logo beanlore-logo dave-n-busters-logo the-filter-coffee-logo shiro-logo
hocco-logo salad-days-logo fast-n-up-logo myprotein-logo muscleblaze-logo gnc-logo superyou-logo trunativ-logo milld-logo
zepto-logo ponds-logo narayana-clinic-logo tribit-logo fourth-frontier-logo hyrox-logo bumble-logo neutrogena-logo
supertails-logo myop-logo niantic-logo hyfit-logo chakra-logo the-wellness-co-logo`
  .split(/\s+/)
  .filter(Boolean);

// Tiles top out around 150x64 CSS px; 3x DPR headroom.
const MAX_W = 480;
const MAX_H = 240;

await mkdir(OUT, { recursive: true });

let before = 0;
let after = 0;
const rows = [];

for (const name of NAMES) {
  const svg = await fetch(`${BASE}/${name}.svg`).then((r) => r.text());
  before += Buffer.byteLength(svg);

  const m = svg.match(/data:image\/(\w+);base64,([A-Za-z0-9+/=]+)/);
  if (!m) {
    rows.push([name, 'NO EMBEDDED RASTER — real vector, leave as-is', 0]);
    continue;
  }

  const raw = Buffer.from(m[2], 'base64');
  const webp = await sharp(raw)
    .trim({ threshold: 8 }) // drop the transparent padding Figma bakes in
    .resize({ width: MAX_W, height: MAX_H, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85, effort: 6 })
    .toBuffer();

  await writeFile(new URL(`${name}.webp`, OUT), webp);
  after += webp.byteLength;
  rows.push([name, m[1], Buffer.byteLength(svg), webp.byteLength]);
}

for (const r of rows) {
  if (r.length === 3) {
    console.log(`${r[0].padEnd(26)} ${r[1]}`);
    continue;
  }
  const [name, kind, b, a] = r;
  console.log(
    `${name.padEnd(26)} ${kind}  ${(b / 1024).toFixed(0).padStart(6)} KiB -> ${(a / 1024).toFixed(1).padStart(6)} KiB  (${(100 - (a / b) * 100).toFixed(1)}% smaller)`
  );
}
console.log(
  `\nTOTAL  ${(before / 1024 / 1024).toFixed(2)} MiB  ->  ${(after / 1024).toFixed(0)} KiB   (${(100 - (after / before) * 100).toFixed(1)}% smaller)`
);
