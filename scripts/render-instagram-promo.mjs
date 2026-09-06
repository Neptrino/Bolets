import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "artifacts/instagram/2026-09-promo");
const remotion = resolve(root, "node_modules/.bin/remotion");
const entry = resolve(root, "video/index.ts");
const publicDir = resolve(root, "video/assets");

function run(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(remotion, args, { cwd: root, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`Remotion exited with code ${code}`));
    });
  });
}

async function renderCarousel(composition, directory) {
  const target = resolve(output, directory);
  await mkdir(target, { recursive: true });
  for (let frame = 0; frame < 5; frame += 1) {
    await run([
      "still",
      entry,
      composition,
      resolve(target, `${String(frame + 1).padStart(2, "0")}.png`),
      `--frame=${frame}`,
      `--public-dir=${publicDir}`,
      "--image-format=png",
      "--overwrite",
    ]);
  }
}

await mkdir(resolve(output, "01-no-es-nomes-un-mapa"), { recursive: true });
await run([
  "render",
  entry,
  "InstagramPromoReel",
  resolve(output, "01-no-es-nomes-un-mapa/reel.mp4"),
  `--public-dir=${publicDir}`,
  "--codec=h264",
  "--crf=20",
  "--pixel-format=yuv420p",
  "--overwrite",
]);
await run([
  "still",
  entry,
  "InstagramPromoReel",
  resolve(output, "01-no-es-nomes-un-mapa/cover.png"),
  "--frame=30",
  `--public-dir=${publicDir}`,
  "--image-format=png",
  "--overwrite",
]);

await renderCarousel("InstagramWeekendCarousel", "02-no-triis-a-cegues");
await renderCarousel("InstagramPrivacyCarousel", "03-racons-privats");

for (const reel of [
  { composition: "InstagramDetailedMapReel", directory: "04-mapa-detallat", coverFrame: 82 },
  { composition: "InstagramMapEvolutionReel", directory: "05-avui-evolucio", coverFrame: 85 },
]) {
  const target = resolve(output, reel.directory);
  await mkdir(target, { recursive: true });
  await run([
    "render",
    entry,
    reel.composition,
    resolve(target, "reel.mp4"),
    `--public-dir=${publicDir}`,
    "--codec=h264",
    "--crf=20",
    "--pixel-format=yuv420p",
    "--overwrite",
  ]);
  await run([
    "still",
    entry,
    reel.composition,
    resolve(target, "cover.png"),
    `--frame=${reel.coverFrame}`,
    `--public-dir=${publicDir}`,
    "--image-format=png",
    "--overwrite",
  ]);
}

console.log(`Instagram campaign rendered to ${output}`);
