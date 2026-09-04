#!/usr/bin/env node
// Prepare a contributed field photograph for the species catalogue.
//
// Auto-orients the source, crops it to a target aspect ratio around a focus point,
// downscales it with Lanczos, applies a light sharpen and writes a metadata-free
// WebP under public/media/contributed/. `npm run media:build` then derives the
// responsive variants exactly as for every other catalogue source.
//
// Usage:
//   node scripts/prepare-contributed-media.mjs --in ~/Pictures/PXL_x.jpg \
//     --out lactarius-deliciosus-field-aleix-20241124 \
//     [--ratio 4:5] [--focus 0.5,0.6] [--zoom 1] [--long-edge 2000] [--quality 86] [--no-sharpen]
//
//   --ratio     target aspect ratio as W:H (default 4:5, the catalogue gallery/Instagram portrait)
//   --focus     x,y fractions (0–1) of the source that should sit at the crop centre (default 0.5,0.5)
//   --zoom      fraction of the largest possible crop to keep, 0 < zoom <= 1 (default 1)
//   --long-edge pixel size of the longest output side (default 2000)
//
// EXIF, GPS, XMP and ICC metadata are always dropped: field photographs carry the
// coordinates of private picking spots. Sources are expected to be sRGB.
import { mkdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

const OUTPUT_DIRECTORY = join(process.cwd(), "public", "media", "contributed");

function parseArguments(argv) {
  const options = {
    ratio: "4:5",
    focus: "0.5,0.5",
    zoom: "1",
    longEdge: "2000",
    quality: "86",
    sharpen: true,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const key = argument.replace(/^--/, "");
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    if (key === "no-sharpen") {
      options.sharpen = false;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined) throw new Error(`Missing value for --${key}`);
    index += 1;
    switch (key) {
      case "in": options.input = value; break;
      case "out": options.output = value; break;
      case "ratio": options.ratio = value; break;
      case "focus": options.focus = value; break;
      case "zoom": options.zoom = value; break;
      case "long-edge": options.longEdge = value; break;
      case "quality": options.quality = value; break;
      default: throw new Error(`Unknown option --${key}`);
    }
  }
  if (!options.input || !options.output) {
    throw new Error("Both --in <source image> and --out <file name without extension> are required");
  }
  if (!/^[a-z0-9-]+$/.test(options.output)) {
    throw new Error("--out must be a lowercase kebab-case name, e.g. lactarius-deliciosus-field-aleix-20241124");
  }
  return options;
}

function parseRatio(value) {
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(value);
  if (!match) throw new Error(`--ratio must look like 4:5, received ${value}`);
  return Number(match[1]) / Number(match[2]);
}

function parseFocus(value) {
  const parts = value.split(",").map(Number);
  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 1)) {
    throw new Error(`--focus must be two fractions between 0 and 1, received ${value}`);
  }
  return parts;
}

function cropRegion(width, height, ratio, [focusX, focusY], zoom) {
  const limitedByHeight = width / height > ratio;
  const cropHeight = Math.round((limitedByHeight ? height : width / ratio) * zoom);
  const cropWidth = Math.round((limitedByHeight ? height * ratio : width) * zoom);
  const left = Math.min(Math.max(Math.round(focusX * width - cropWidth / 2), 0), width - cropWidth);
  const top = Math.min(Math.max(Math.round(focusY * height - cropHeight / 2), 0), height - cropHeight);
  return { left, top, width: cropWidth, height: cropHeight };
}

const options = parseArguments(process.argv.slice(2));
const ratio = parseRatio(options.ratio);
const focus = parseFocus(options.focus);
const zoom = Number(options.zoom);
const longEdge = Number(options.longEdge);
const quality = Number(options.quality);
if (!(zoom > 0 && zoom <= 1)) throw new Error("--zoom must be within (0, 1]");
if (!(longEdge >= 640)) throw new Error("--long-edge must be at least 640");

const inputPath = resolve(options.input.replace(/^~(?=\/)/, process.env.HOME ?? "~"));
const outputPath = join(OUTPUT_DIRECTORY, `${options.output}.webp`);

const source = sharp(inputPath, { failOn: "none" }).rotate();
const metadata = await source.metadata();
const rotated = (metadata.orientation ?? 1) >= 5;
const sourceWidth = rotated ? metadata.height : metadata.width;
const sourceHeight = rotated ? metadata.width : metadata.height;
if (!sourceWidth || !sourceHeight) throw new Error(`Could not read the dimensions of ${inputPath}`);

const region = cropRegion(sourceWidth, sourceHeight, ratio, focus, zoom);
const portrait = ratio < 1;
const resize = portrait ? { height: longEdge } : { width: longEdge };

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
let pipeline = source
  .extract(region)
  .resize({ ...resize, kernel: sharp.kernel.lanczos3, withoutEnlargement: true });
if (options.sharpen) pipeline = pipeline.sharpen({ sigma: 0.6, m1: 0.5, m2: 1 });
await pipeline
  .webp({ quality, effort: 6, smartSubsample: true })
  .toFile(outputPath);

const written = await sharp(outputPath).metadata();
const { size } = await stat(outputPath);
const leftoverMetadata = ["exif", "icc", "xmp", "iptc"].filter((key) => written[key]);
if (leftoverMetadata.length > 0) throw new Error(`Output still carries metadata: ${leftoverMetadata.join(", ")}`);

console.log(
  `${options.output}.webp ← ${sourceWidth}×${sourceHeight} crop ${region.width}×${region.height}@${region.left},${region.top}` +
  ` → ${written.width}×${written.height}, ${Math.round(size / 1024)} KB, q${quality}${options.sharpen ? ", sharpened" : ""}, metadata stripped`,
);
