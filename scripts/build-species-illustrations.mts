/**
 * Convert the editorial species drawings from the creative archive into the
 * committed app assets: transparent WebP, at most 480 px on the long side.
 * Sheet crops come on a white page, so near-white pixels connected to the
 * edge are made transparent (the drawings themselves keep their whites).
 *
 *   npm run illustrations:species -- [--force] [speciesId ...]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { speciesIllustrationAssets } from "../data/species-illustrations.ts";

const OUTPUT_DIRECTORY = "public/media/illustrations";
const MAX_SIDE = 480;
const WHITE_THRESHOLD = 236;
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = new Set(args.filter((arg) => !arg.startsWith("--")));

async function cutout(input: Buffer) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const seen = new Uint8Array(width * height);
  const queue: number[] = [];
  const isPage = (index: number) => {
    const offset = index * channels;
    // Transparent margins have to be traversable. A source exported with the
    // page already cut away at its border would otherwise block the fill
    // before it reaches the white the drawing still sits on.
    if (data[offset + 3] < 8) return true;
    return data[offset] >= WHITE_THRESHOLD && data[offset + 1] >= WHITE_THRESHOLD && data[offset + 2] >= WHITE_THRESHOLD;
  };
  const push = (index: number) => { if (!seen[index] && isPage(index)) { seen[index] = 1; queue.push(index); } };
  for (let x = 0; x < width; x += 1) { push(x); push((height - 1) * width + x); }
  for (let y = 0; y < height; y += 1) { push(y * width); push(y * width + width - 1); }
  while (queue.length) {
    const index = queue.pop()!;
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }
  for (let index = 0; index < width * height; index += 1) {
    if (!seen[index]) continue;
    data[index * channels + 3] = 0;
  }
  // Soften the cut edge: pixels next to the page fade with their own lightness.
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
let failures = 0;
for (const [speciesId, asset] of Object.entries(speciesIllustrationAssets)) {
  if (only.size && !only.has(speciesId)) continue;
  const output = join(OUTPUT_DIRECTORY, `${speciesId}.webp`);
  if (!force && existsSync(output)) { console.log(`${speciesId}: kept`); continue; }
  try {
    if (!existsSync(asset.source)) throw new Error(`missing source ${asset.source}`);
    let image = sharp(asset.source).toBuffer();
    if (asset.cutout) image = image.then(cutout);
    const trimmed = await sharp(await image).trim({ threshold: 8 }).resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 90, effort: 6 }).toBuffer();
    await writeFile(output, trimmed);
    console.log(`${speciesId}: ${(trimmed.byteLength / 1024).toFixed(0)} KB`);
  } catch (error) {
    failures += 1;
    console.error(`${speciesId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (failures) process.exit(1);
