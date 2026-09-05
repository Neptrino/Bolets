// Offline design fixtures only. Never uploads or publishes.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { renderInstagramDailyCard } from "@/src/lib/instagram-daily-render";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";

async function main() {
  const folder = resolve("artifacts/instagram/daily-style-preview");
  await mkdir(folder, { recursive: true });
  const card: DailyShareCard = { slug: "catalunya", title: "Catalunya", eyebrow: "Mostra", available: true, isPreview: true, observedAt: "2026-09-05T06:00:00Z", scope: "overview", scopeLabel: "Catalunya", mapPath: "/map", shareText: "MOSTRA", readings: ["Cerdanya", "Ripollès", "Berguedà"].map((regionName, i) => ({ speciesId: "boletus-edulis", speciesName: "Cep", regionName, score: 64 - i, label: "Alta", positiveCellShare: 0.42, score20CellShare: 0.18 })) };
  const thumbs = [];
  for (const format of ["story", "feed"] as const) {
    const bytes = Buffer.from(await (await renderInstagramDailyCard({ card, format })).arrayBuffer());
    await writeFile(resolve(folder, `${format}.png`), bytes);
    thumbs.push(await sharp(bytes).resize(432, 768, { fit: "contain", background: "#f4ecd7" }).toBuffer());
  }
  await sharp({ create: { width: 872, height: 768, channels: 3, background: "#f4ecd7" } }).composite(thumbs.map((input, i) => ({ input, left: i * 440, top: 0 }))).jpeg().toFile(resolve(folder, "preview.jpg"));
  console.log(folder);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
