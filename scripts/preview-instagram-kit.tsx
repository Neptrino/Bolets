// Local profile preview. No Buffer connection, publication, or production writes.
// Optional argument: a previously rendered combined Avui map image.
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { renderInstagramCover, renderInstagramEducationSlide, renderInstagramPinnedCover } from "@/src/lib/instagram-editorial-render";
import { renderInstagramSpeciesSlide } from "@/src/lib/instagram-species-card-render";
import { renderInstagramWeekendSlide } from "@/src/lib/instagram-weekend-render";
import { instagramSpeciesPublicationForSpecies } from "@/src/lib/instagram-species-series";
import { educationCovers } from "@/src/lib/instagram-editorial-covers";
import { instagramEducationTopics } from "@/src/lib/instagram-education";
import { pinnedInstagramPosts } from "@/src/lib/instagram-pinned-posts";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";

const card: DailyShareCard = {
  slug: "catalunya", title: "Mostra de disseny", eyebrow: "Mostra", observedAt: "2026-09-05T06:00:00Z",
  available: true, isPreview: true, scope: "overview", scopeLabel: "Catalunya", mapPath: "/map", shareText: "MOSTRA — DADES FICTÍCIES",
  readings: [{ speciesId: "boletus-edulis", speciesName: "Cep", regionName: "Val d’Aran", score: 64, label: "Alta", positiveCellShare: 0.42, score20CellShare: 0.18 }],
};

async function exists(path: string) { try { await access(path); return true; } catch { return false; } }
async function main() {
  const output = resolve("artifacts/instagram/profile-kit");
  await mkdir(output, { recursive: true });
  async function save(name: string, response: Promise<Response>) {
    const bytes = Buffer.from(await (await response).arrayBuffer());
    const path = resolve(output, `${name}.png`);
    await writeFile(path, bytes);
    return path;
  }
  for (const post of pinnedInstagramPosts) await save(post.series, renderInstagramPinnedCover(post.series));
  for (const topic of instagramEducationTopics) {
    for (let slide = 1; slide <= 5; slide++) await save(`education-${topic.id}-${slide}`, renderInstagramEducationSlide({ card, topicId: topic.id, slide }));
  }
  for (const id of ["boletus-edulis", "lactarius-deliciosus", "macrolepiota-procera"]) {
    const { profile } = instagramSpeciesPublicationForSpecies(id);
    for (let slide = 1; slide <= 5; slide++) await save(`species-${id}-${slide}`, renderInstagramSpeciesSlide({ profile, slide }));
  }
  const photoBrief = { layout: "photo" as const, speciesId: "lactarius-deliciosus", eyebrow: "A peu de bosc", title: "Mira més a prop.", subtitle: "Aprendre també és aturar-se." };
  const field = await save("field-detail", renderInstagramCover({ brief: photoBrief }));
  await save("question-story", renderInstagramCover({ brief: educationCovers.water, format: "story" }));
  await save("photo-story", renderInstagramCover({ brief: photoBrief, format: "story" }));
  let map = resolve(output, "pinned-method.png");
  if (process.argv[2]) {
    const jpg = await sharp(await readFile(resolve(process.argv[2]))).jpeg().toBuffer();
    map = await save("weekend-cover", renderInstagramWeekendSlide({ card, slide: 1, mapImageUrl: `data:image/jpeg;base64,${jpg.toString("base64")}` }));
  }
  const ad = resolve("artifacts/instagram/2026-09-map-campaign/singles/22-mapa-bolets-app.png");
  const reel = resolve("artifacts/instagram/2026-09-map-campaign/02-el-mapa-tambe-canvia/cover.png");
  const entries = [
    await exists(ad) ? ad : resolve(output, "pinned-start.png"),
    map,
    resolve(output, "species-boletus-edulis-1.png"),
    await exists(reel) ? reel : resolve(output, "pinned-method.png"),
    resolve(output, "education-water-1.png"),
    resolve(output, "species-lactarius-deliciosus-1.png"),
    resolve(output, "education-habitat-1.png"),
    resolve(output, "species-macrolepiota-procera-1.png"),
    field,
  ];
  // Full reference Reel frame is retained (not an automatic Instagram crop).
  const thumbs = await Promise.all(entries.map(path => sharp(path).resize(360, 450, { fit: "contain", background: "#14271c" }).toBuffer()));
  await sharp({ create: { width: 1092, height: 1362, channels: 3, background: "#ffffff" } })
    .composite(thumbs.map((input, i) => ({ input, left: i % 3 * 366, top: Math.floor(i / 3) * 456 })))
    .jpeg({ quality: 92 }).toFile(resolve(output, "profile-preview.jpg"));
  await writeFile(resolve(output, "README.md"), `# Profile preview\n\nDesign study: existing ad and Reel are references, new covers are proposals. Not a publication queue. No profile edits or publishing. The weekend cover is marked MOSTRA; a supplied map is a dated reference. Full Reel frames are contained in the preview, so this is not an exact Instagram grid crop.\n\n${entries.map((path, i) => `${i + 1}. ${path}`).join("\n")}\n`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
