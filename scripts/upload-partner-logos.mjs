// Uploads the WebP logos produced by convert-partner-logos.mjs to Supabase Storage.
// Run with: node --env-file=.env.local scripts/upload-partner-logos.mjs
import { readdir, readFile } from 'node:fs/promises';

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.STRIDE_SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'stride-assets';
const PREFIX = 'images/logos';
const SRC = new URL('./webp/', import.meta.url);

if (!URL_BASE || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or STRIDE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const files = (await readdir(SRC)).filter((f) => f.endsWith('.webp')).sort();
let ok = 0;
const failed = [];

for (const file of files) {
  const body = await readFile(new URL(file, SRC));
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${PREFIX}/${file}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'x-upsert': 'true',
    },
    body,
  });
  if (res.ok) {
    ok++;
    console.log(`  ok  ${file}  ${(body.byteLength / 1024).toFixed(1)} KiB`);
  } else {
    failed.push([file, res.status, (await res.text()).slice(0, 120)]);
  }
}

console.log(`\nuploaded ${ok}/${files.length}`);
if (failed.length) {
  for (const [f, s, msg] of failed) console.error(`  FAIL ${f} -> ${s} ${msg}`);
  process.exit(1);
}
