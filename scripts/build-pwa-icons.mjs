#!/usr/bin/env node
/**
 * Renders the installable-app icons from the version-controlled brand assets.
 *
 * The "any" and Apple icons use the official app icon. The maskable icon uses
 * the standalone mushroom over an edge-to-edge brand background, because a
 * launcher is free to crop that canvas to a circle or another system shape.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceIcon = join(projectRoot, "app", "icon.svg");
const sourceSingleMark = join(projectRoot, "public", "brand", "bolets-single.svg");
const outputDirectory = join(projectRoot, "public", "icons");
const faviconPath = join(projectRoot, "public", "favicon.ico");

// The standalone SVG already includes whitespace around the mushroom. An
// additional 10% canvas inset keeps its artwork inside the maskable safe zone.
const MASKABLE_SAFE_ZONE_PADDING = 0.1;
const BACKGROUND = "#3b3b3b";

async function renderAny(source, size) {
  return sharp(source, { density: 512 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function renderMaskable(source, size) {
  const inner = Math.round(size * (1 - MASKABLE_SAFE_ZONE_PADDING * 2));
  const mark = await sharp(source, { density: 512 }).resize(inner, inner).png().toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toBuffer();
}

async function renderOpaque(source, size) {
  const mark = await sharp(source, { density: 512 }).resize(size, size).png().toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toBuffer();
}

// ICO files can contain PNG data directly. Keeping this tiny wrapper here
// means the traditional /favicon.ico stays derived from the same source mark
// without introducing a platform-specific image-conversion dependency.
function icoFromPng(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directory = Buffer.alloc(16);
  directory.writeUInt8(size === 256 ? 0 : size, 0);
  directory.writeUInt8(size === 256 ? 0 : size, 1);
  directory.writeUInt16LE(1, 4);
  directory.writeUInt16LE(32, 6);
  directory.writeUInt32LE(png.length, 8);
  directory.writeUInt32LE(header.length + directory.length, 12);

  return Buffer.concat([header, directory, png]);
}

async function main() {
  const source = await readFile(sourceIcon);
  const singleMark = await readFile(sourceSingleMark);
  await mkdir(outputDirectory, { recursive: true });

  const outputs = [
    ["icon-192.png", await renderAny(source, 192)],
    ["icon-512.png", await renderAny(source, 512)],
    ["icon-maskable-512.png", await renderMaskable(singleMark, 512)],
    // iOS ignores the manifest icons for the home screen and reads this one,
    // and it composites onto white, so it must not be transparent.
    ["apple-touch-icon.png", await renderOpaque(source, 180)],
  ];

  for (const [name, buffer] of outputs) {
    await writeFile(join(outputDirectory, name), buffer);
    console.log(`wrote public/icons/${name} (${buffer.length} bytes)`);
  }

  const favicon = icoFromPng(await renderAny(source, 32), 32);
  await writeFile(faviconPath, favicon);
  console.log(`wrote public/favicon.ico (${favicon.length} bytes)`);
}

await main();
