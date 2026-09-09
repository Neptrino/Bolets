// Prepares a photograph for the promo hero: auto-orient, upscale to at least
// 2160 px wide with Lanczos, a modest contrast and saturation lift, a light
// sharpen. Optional crop as a fraction of the source: top,height (0-1).
//   node scripts/prepare-hero-photo.mjs <input> <output.jpg> [topFraction heightFraction]
import sharp from "sharp";

const [input, output, topArg, heightArg] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node scripts/prepare-hero-photo.mjs <input> <output.jpg> [topFraction heightFraction]");
  process.exit(1);
}
const image = sharp(input, { failOn: "none" }).rotate();
const meta = await image.metadata();
let pipeline = image;
if (topArg && heightArg) {
  const top = Math.round(Number(topArg) * meta.height);
  const height = Math.round(Number(heightArg) * meta.height);
  pipeline = pipeline.extract({ left: 0, top, width: meta.width, height });
}
await pipeline
  .resize({ width: Math.max(2160, meta.width), kernel: "lanczos3", withoutEnlargement: false })
  .modulate({ saturation: 1.12, brightness: 1.02 })
  .linear(1.06, -6)
  .sharpen({ sigma: 0.9 })
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(output);
const out = await sharp(output).metadata();
console.log(`${output}: ${out.width}×${out.height}`);
