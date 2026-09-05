// Offline labelled editorial fixtures. Never uploads or publishes.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { renderInstagramEducationSlide } from "@/src/lib/instagram-editorial-render";
import { instagramFieldLessons } from "@/src/lib/instagram-field-lessons";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";

async function main() {
  const folder = resolve("artifacts/instagram/field-lessons-preview");
  await mkdir(folder, { recursive: true });
  const card: DailyShareCard = { slug: "catalunya", title: "Catalunya", eyebrow: "Mostra", available: false, isPreview: true, observedAt: null, scope: "overview", scopeLabel: "Catalunya", mapPath: "/map", shareText: "MOSTRA", readings: [] };
  for (const topic of instagramFieldLessons) {
    const thumbs = [];
    for (let slide = 1; slide <= 5; slide++) {
      const bytes = Buffer.from(await (await renderInstagramEducationSlide({ card, topicId: topic.id, slide })).arrayBuffer());
      await writeFile(resolve(folder, `${topic.id}-${slide}.png`), bytes);
      thumbs.push({ input: await sharp(bytes).resize(270, 338).toBuffer(), left: (slide - 1) * 278, top: 0 });
    }
    await sharp({ create: { width: 1382, height: 338, channels: 3, background: "#ffffff" } }).composite(thumbs).png().toFile(resolve(folder, `${topic.id}-overview.png`));
  }
  console.log(folder);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
