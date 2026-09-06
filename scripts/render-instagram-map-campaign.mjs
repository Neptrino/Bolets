import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

// Renders the map-first Instagram campaign (artifacts/instagram/2026-09-map-campaign).
// Captures come from `node scripts/capture-map-campaign.mjs`; stock hooks live in
// video/assets/stock (mirrored from ~/Desktop/Bolets/Resources, not committed).
// Usage: node scripts/render-instagram-map-campaign.mjs [piece-prefix]

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "artifacts/instagram/2026-09-map-campaign");
const remotion = resolve(root, "node_modules/.bin/remotion");
const entry = resolve(root, "video/index.ts");
const publicDir = resolve(root, "video/assets");
const only = process.argv[2];

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

async function still(composition, target, frame = 0) {
  await run(["still", entry, composition, target, `--frame=${frame}`, `--public-dir=${publicDir}`, "--image-format=png", "--overwrite"]);
}

async function renderReel({ composition, directory, coverFrame }) {
  const target = resolve(output, directory);
  await mkdir(target, { recursive: true });
  await run(["render", entry, composition, resolve(target, "reel.mp4"), `--public-dir=${publicDir}`, "--codec=h264", "--crf=20", "--pixel-format=yuv420p", "--overwrite"]);
  await still(composition, resolve(target, "cover.png"), coverFrame);
}

async function renderCarousel({ composition, directory }) {
  const target = resolve(output, directory);
  await mkdir(target, { recursive: true });
  for (let frame = 0; frame < 5; frame += 1) {
    await still(composition, resolve(target, `${String(frame + 1).padStart(2, "0")}.png`), frame);
  }
}

const pieces = [
  { directory: "01-on-miraries-avui", kind: "reel", composition: "InstagramMapReelWhere", coverFrame: 150 },
  { directory: "02-el-mapa-tambe-canvia", kind: "reel", composition: "InstagramMapReelEvolution", coverFrame: 120 },
  { directory: "03-com-llegir-el-mapa", kind: "carousel", composition: "InstagramMapReadCarousel" },
  { directory: "04-el-mapa-canvia-amb-l-especie", kind: "reel", composition: "InstagramMapReelSpecies", coverFrame: 200 },
  { directory: "05-dos-territoris-dos-senyals", kind: "reel", composition: "InstagramMapReelTerritories", coverFrame: 130 },
  { directory: "06-el-mapa-no-es-un-gps", kind: "carousel", composition: "InstagramMapNotGpsCarousel" },
  { directory: "07-la-guia", kind: "reel", composition: "InstagramMapReelGuide", coverFrame: 150 },
  { directory: "08-abans-de-sortir", kind: "reel", composition: "InstagramTextReelWeekend", coverFrame: 80 },
  { directory: "09-surt-amb-criteri", kind: "reel", composition: "InstagramTextReelRespect", coverFrame: 80 },
  { directory: "10-on-son-els-bolets", kind: "reel", composition: "InstagramTextReelWhere", coverFrame: 30 },
  { directory: "11-tria-l-especie", kind: "carousel", composition: "InstagramMapSpeciesCarousel" },
  { directory: "12-tres-valls", kind: "carousel", composition: "InstagramMapValleysCarousel" },
  { directory: "14-la-fitxa", kind: "carousel", composition: "InstagramMapProfileCarousel" },
];

const singles = [
  { file: "15-quin-bolet-es.png", composition: "InstagramSingleQuiz" },
  { file: "16-tallar-o-arrencar.png", composition: "InstagramSingleDebate" },
  { file: "17-tres-noms.png", composition: "InstagramSingleNames" },
  { file: "18-realitat-vs-mapa.png", composition: "InstagramSingleReality" },
  { file: "19-cap-de-setmana.png", composition: "InstagramSingleWeekend" },
  { file: "20-especie-de-la-setmana.png", composition: "InstagramSingleSpecies" },
  { file: "21-diari-de-temporada.png", composition: "InstagramSingleSeason" },
  { file: "22-mapa-bolets-app.png", composition: "InstagramSinglePromo" },
];

// Ad set for the promo single: feed 4:5, ad-safe 1:1 and Stories/Reels 9:16.
const ads = [
  { file: "22-mapa-bolets-app-4x5.png", composition: "InstagramSinglePromo" },
  { file: "22-mapa-bolets-app-1x1.png", composition: "InstagramSinglePromoSquare" },
  { file: "22-mapa-bolets-app-9x16.png", composition: "InstagramSinglePromoStory" },
];

const stories = [
  { file: "01-on-miraries-avui.png", composition: "InstagramMapStoryWhere" },
  { file: "02-avui-no-es-ahir.png", composition: "InstagramMapStoryEvolution" },
  { file: "03-tres-coses.png", composition: "InstagramMapStoryChecklist" },
  { file: "04-nou-reel.png", composition: "InstagramMapStoryTeaser" },
];

for (const piece of pieces) {
  if (only && !piece.directory.startsWith(only)) continue;
  if (piece.kind === "reel") await renderReel(piece);
  else await renderCarousel(piece);
}

if (!only || "singles".startsWith(only)) {
  const target = resolve(output, "singles");
  await mkdir(target, { recursive: true });
  for (const single of singles) await still(single.composition, resolve(target, single.file), 0);
}

if (!only || "stories".startsWith(only)) {
  const target = resolve(output, "stories");
  await mkdir(target, { recursive: true });
  for (const story of stories) await still(story.composition, resolve(target, story.file), 0);
}

if (!only || "ads".startsWith(only)) {
  const target = resolve(output, "ads");
  await mkdir(target, { recursive: true });
  for (const ad of ads) await still(ad.composition, resolve(target, ad.file), 0);
}

console.log(`Map campaign rendered to ${output}`);
