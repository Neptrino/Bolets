#!/usr/bin/env node
/**
 * Renders the installable-app icons from the single source mark in
 * app/icon.svg, so the home-screen icon can never drift from the site icon.
 *
 * Two shapes are produced. The "any" icons keep the mark's own rounded square.
 * The maskable icon is padded into the safe zone and painted edge to edge,
 * because a launcher is free to crop a maskable icon to a circle and would
 * otherwise clip the mushroom.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceIcon = join(projectRoot, "app", "icon.svg");
const outputDirectory = join(projectRoot, "public", "icons");
const faviconPath = join(projectRoot, "public", "favicon.ico");

// The share of the maskable canvas a launcher may crop away. 20% padding on
// every side keeps the mark inside the guaranteed-visible circle.
const MASKABLE_SAFE_ZONE_PADDING = 0.2;
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
  await mkdir(outputDirectory, { recursive: true });

  const outputs = [
    ["icon-192.png", await renderAny(source, 192)],
    ["icon-512.png", await renderAny(source, 512)],
    ["icon-maskable-512.png", await renderMaskable(source, 512)],
    // iOS ignores the manifest icons for the home screen and reads this one,
    // and it composites onto white, so it must not be transparent.
    ["apple-touch-icon.png", await renderMaskable(source, 180)],
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
