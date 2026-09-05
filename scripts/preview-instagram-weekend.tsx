// Local design sample; never publishes or reads production credentials.
// npx tsx scripts/preview-instagram-weekend.tsx [map-image-path]
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { WEEKEND_SLIDE_COUNT } from "@/components/instagram-weekend-card";
import { renderInstagramWeekendSlide } from "@/src/lib/instagram-weekend-render";
import { weekendReelFfmpegArgs } from "@/src/lib/weekend-reel-render";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";

const card: DailyShareCard = {
  slug: "catalunya", title: "Mostra de disseny", eyebrow: "Mostra",
  observedAt: "2026-09-04T12:00:00Z", available: true, isPreview: true,
  readings: [
    { speciesId: "boletus-edulis", speciesName: "Cep", regionName: "Val d’Aran", score: 64, label: "Alta", positiveCellShare: 0.42, score20CellShare: 0.18 },
    { speciesId: "lactarius-deliciosus", speciesName: "Pinetell", regionName: "Ripollès", score: 46, label: "Mitjana", positiveCellShare: 0.27, score20CellShare: 0.12 },
    { speciesId: "boletus-edulis", speciesName: "Cep", regionName: "Cerdanya", score: 9, label: "Molt baixa", positiveCellShare: 0.08, score20CellShare: 0 },
  ],
  mapPath: "/map", shareText: "MOSTRA DE DISSENY — DADES FICTÍCIES", scope: "overview", scopeLabel: "Catalunya",
};

async function main() {
  const directory = resolve("artifacts/instagram/weekend-redesign");
  await mkdir(directory, { recursive: true });
  // A supplied map is a visual reference only: every frame is marked MOSTRA.
  const mapImageUrl = process.argv[2]
    ? `data:image/jpeg;base64,${(await sharp(await readFile(resolve(process.argv[2]))).jpeg().toBuffer()).toString("base64")}`
    : undefined;
  const paths: string[] = [];
  const thumbnails: Buffer[] = [];
  for (let slide = 1; slide <= WEEKEND_SLIDE_COUNT; slide++) {
    const response = await renderInstagramWeekendSlide({ card, slide, mapImageUrl });
    const png = Buffer.from(await response.arrayBuffer());
    const path = resolve(directory, `slide-${slide}.png`);
    await writeFile(path, png);
    paths.push(path);
    thumbnails.push(await sharp(png).resize({ width: 324 }).toBuffer());
  }
  await sharp({ create: { width: 3 * 324 + 2 * 12, height: 2 * 576 + 12, channels: 3, background: "#d4cebd" } })
    .composite(thumbnails.map((input, i) => ({ input, left: i % 3 * 336, top: Math.floor(i / 3) * 588 })))
    .jpeg({ quality: 90 }).toFile(resolve(directory, "contact-sheet.jpg"));
  const result = spawnSync("ffmpeg", weekendReelFfmpegArgs(paths, resolve(directory, "weekend-preview.mp4")), { stdio: "inherit" });
  if (result.status !== 0) throw new Error("Reel encoding failed");
  await writeFile(resolve(directory, "README.md"), "# Weekend design sample\n\nFictional readings for layout review, dated 4 September 2026. Not a current conditions report. Catalogue photo with its attribution retained. A supplied map is a visual reference only. Nothing published.\n");
  console.log(directory);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
