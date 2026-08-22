// Normalises a single partner logo into the shape images/logos actually needs:
// artwork that reads on transparency, trimmed and sized for the tile.
//
// Partner tiles are `bg-white`. Brand exports almost always arrive built for a
// dark background instead — light artwork on an opaque dark plate — which renders
// as a black block, or vanishes entirely once the plate is stripped. The modes
// below cover the ways out, and which one is right depends on one thing: whether
// the artwork's own colours have enough contrast to survive on white.
//
// Run with: node scripts/prepare-partner-logo.mjs <source-image> <out-name> [mode] [floor]
//   mode: 'dark' (default)  key a dark plate, recolour the artwork black
//         'light'           key a white plate, recolour the artwork black
//         'dark-keep'       key a dark plate, keep the artwork's own colours.
//                           Only for artwork dark enough to read on white — a
//                           pale or white mark needs 'none' instead.
//         'light-keep'      key a white plate, keep the artwork's own colours
//         'none'            no keying at all — trim, resize and re-encode with
//                           the source's own colours and alpha. Use it for
//                           artwork already dark-on-transparent, and for a
//                           pale-on-dark logo whose colours have to survive
//                           (the plate then reads as a chip on the white tile).
//   floor: optional 0-254 override for the keying cut-off. The cut-off is read
//          off the border by default, which fails when the plate carries its own
//          mid-tone framing or the artwork bleeds to the edge. Check the render
//          before reaching for this.
//
//   e.g. node scripts/prepare-partner-logo.mjs ~/Downloads/chakra-logo.webp chakra-athletica-logo
//        node scripts/prepare-partner-logo.mjs ~/Downloads/ultrahuman-logo.webp ultrahuman-logo light
//        node scripts/prepare-partner-logo.mjs ~/Downloads/alienkind-logo.webp alienkind-logo dark-keep
//        node scripts/prepare-partner-logo.mjs ~/Downloads/kyro-logo.webp kyro-logo-on-dark none
//
// Writes scripts/webp/<out-name>.webp, which upload-partner-logos.mjs then ships.
import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const MODES = ['dark', 'light', 'dark-keep', 'light-keep', 'none'];

const [src, name, mode = 'dark', floorArg] = process.argv.slice(2);
const floorOverride = floorArg === undefined ? null : Number(floorArg);
if (
  !src ||
  !name ||
  !MODES.includes(mode) ||
  (floorOverride !== null && !(Number.isInteger(floorOverride) && floorOverride >= 0 && floorOverride < 255))
) {
  console.error(`usage: node scripts/prepare-partner-logo.mjs <source-image> <out-name> [${MODES.join('|')}] [floor 0-254]`);
  process.exit(1);
}

// The plate is what gets keyed out; keepColour decides whether what survives is
// recoloured flat black or left as the brand shipped it.
const plate = mode === 'none' ? 'none' : mode.startsWith('light') ? 'light' : 'dark';
const keepColour = mode.endsWith('-keep');

const OUT_DIR = new URL('./webp/', import.meta.url);

// Tiles top out around 150x64 CSS px; 3x DPR headroom. Same budget as the batch
// pipeline in convert-partner-logos.mjs.
const MAX_W = 480;
const MAX_H = 240;

const { width, height } = await sharp(src).metadata();
const sourceBytes = (await stat(src)).size;

// 'none' skips keying entirely: the source goes straight to the trim/resize pass
// with its own colours and alpha intact.
let masked;
let keyedAt = 'n/a';

if (plate === 'none') {
  masked = await sharp(src).png().toBuffer();
} else {
  // Luminance is the alpha mask. On a dark plate the artwork is the bright part, so
  // luminance maps straight to coverage; on a light plate it is the dark part, so
  // the mask is inverted. Anti-aliased edges land in between either way and become
  // partial coverage. Pairing that mask with flat black gives artwork that reads on
  // a white tile.
  // Flatten onto the plate colour before measuring, never removeAlpha(). Exports
  // routinely feather the plate edge as semi-transparent *light* pixels, and
  // dropping the alpha channel promotes every one of them to full luminance —
  // which keys the plate's outline back in as a dark halo around the artwork.
  // Compositing lets those pixels fall to the plate's own level instead.
  let mask = sharp(src)
    .flatten({ background: plate === 'light' ? '#ffffff' : '#000000' })
    .greyscale()
    .normalise();
  if (plate === 'light') mask = mask.negate();
  const raw = await mask.raw().toBuffer();

  // Plates are never quite #000 or #fff, and normalise() only pins the 1st
  // percentile — enough noise survives to render as a faint grey box behind the
  // logo. So read the real plate level off the 1px border (which is plate by
  // definition on a padded export) and drive everything at or below it to zero.
  const border = [];
  for (let x = 0; x < width; x++) {
    border.push(raw[x], raw[(height - 1) * width + x]);
  }
  for (let y = 0; y < height; y++) {
    border.push(raw[y * width], raw[y * width + width - 1]);
  }
  const FALLBACK_FLOOR = 35;
  const MARGIN = 6;
  let floor = floorOverride ?? Math.max(...border) + MARGIN;
  if (floorOverride === null && floor > 128) {
    // Artwork is bleeding into the border, so the sample is not the plate.
    console.warn(`  border sample reads ${floor} — artwork touches the edge; using floor ${FALLBACK_FLOOR}`);
    floor = FALLBACK_FLOOR;
  }

  // Rescale what is left so the floor lands on 0 and full coverage stays at 255.
  const span = 255 - floor;
  const alpha = Buffer.allocUnsafe(raw.length);
  for (let i = 0; i < raw.length; i++) {
    alpha[i] = raw[i] <= floor ? 0 : Math.round(((raw[i] - floor) * 255) / span);
  }

  // What the surviving alpha gets painted with: the brand's own pixels when the
  // artwork is dark enough to read on white, flat black when it is not. Either
  // way the base is flattened onto the plate colour first, so the RGB under a
  // feathered edge is the plate's rather than an arbitrary leftover.
  const base = keepColour
    ? await sharp(src)
        .flatten({ background: plate === 'light' ? '#ffffff' : '#000000' })
        .raw()
        .toBuffer()
    : Buffer.alloc(width * height * 3, 0);

  masked = await sharp(base, { raw: { width, height, channels: 3 } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
  keyedAt = String(floor);
}

// The keying above runs as its own pass on purpose: trim and resize measure the
// image, and they only see a real alpha channel once it has been encoded.
let trimmed = await sharp(masked)
  .trim({ threshold: 8 }) // drop the plate padding baked around the artwork
  .png()
  .toBuffer();

// A kept plate becomes a visible chip on the white tile, and trimming leaves the
// artwork flush against its edges — which reads as a crop, not a logo. Put a
// margin back in the plate's own colour. Keyed logos need none of this: their
// background is transparency, so flush edges are exactly right.
const trimmedMeta = await sharp(trimmed).metadata();
if (plate === 'none' && !trimmedMeta.hasAlpha) {
  const { data: corner } = await sharp(trimmed)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pad = Math.round(trimmedMeta.height * 0.08);
  trimmed = await sharp(trimmed)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: corner[0], g: corner[1], b: corner[2] },
    })
    .png()
    .toBuffer();
}

await mkdir(OUT_DIR, { recursive: true });
const out = fileURLToPath(new URL(`${name}.webp`, OUT_DIR));
const info = await sharp(trimmed)
  .resize({ width: MAX_W, height: MAX_H, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 85, effort: 6 })
  .toFile(out);

console.log(`source  ${width}x${height}  ${(sourceBytes / 1024).toFixed(1)} KiB  mode ${mode}, keyed at ${keyedAt}`);
console.log(`output  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KiB  alpha`);
console.log(`        ${(100 - (info.size / sourceBytes) * 100).toFixed(1)}% smaller  ->  scripts/webp/${name}.webp`);
