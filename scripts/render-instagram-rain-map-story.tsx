// Renders the 1080 × 1920 Story that announces the rain map, painting the real
// map render into the shared Instagram frame:
//
//   npx tsx --tsconfig tsconfig.json scripts/render-instagram-rain-map-story.tsx \
//     [--brief social/2026-09-17-mapa-pluja/brief.json] \
//     [--map http://localhost:3101/mapa-pluja/imatge]
//
// The map comes from the running site rather than from `renderRainMap`: that
// module is server-only, so the route is the one way a script can read the same
// painted publication the page shows. Output lands beside the brief.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";

import {
  InstagramRainMapStory,
  RAIN_STORY_MAP_HEIGHT,
  RAIN_STORY_MAP_WIDTH,
  type InstagramRainMapStoryBrief,
} from "@/components/instagram-rain-map-story";
import { instagramCardFonts } from "@/src/lib/instagram-card-fonts";
import { instagramFormats } from "@/src/lib/instagram-design";

const DEFAULT_BRIEF = "social/2026-09-17-mapa-pluja/brief.json";
const DEFAULT_MAP = "http://localhost:3101/mapa-pluja/imatge";

/**
 * The route paints Catalonia inside a 1200 × 1080 frame with sea and Aragó
 * around it. Trimming the band above Val d'Aran and below Amposta gives the
 * panel its shape without cutting any of the territory, which spans roughly
 * y 55 to y 975 in the render.
 */
const MAP_CROP = { left: 0, top: 46, width: 1200, height: 938 };

function option(name: string, fallback: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

async function readMap(source: string) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`The rain map route answered ${response.status}. Is the site running?`);
    return Buffer.from(await response.arrayBuffer());
  }
  return readFile(resolve(process.cwd(), source));
}

async function main() {
  const briefPath = resolve(process.cwd(), option("brief", DEFAULT_BRIEF));
  const brief = JSON.parse(await readFile(briefPath, "utf8")) as Omit<InstagramRainMapStoryBrief, "mapDataUrl">;

  const map = await sharp(await readMap(option("map", DEFAULT_MAP)))
    .extract(MAP_CROP)
    .resize(RAIN_STORY_MAP_WIDTH, RAIN_STORY_MAP_HEIGHT)
    .png()
    .toBuffer();

  const { width, height } = instagramFormats.story;
  const image = new ImageResponse(
    <InstagramRainMapStory brief={{ ...brief, mapDataUrl: `data:image/png;base64,${map.toString("base64")}` }} />,
    { width, height, fonts: await instagramCardFonts() },
  );
  const png = Buffer.from(await image.arrayBuffer());

  const directory = dirname(briefPath);
  await writeFile(resolve(directory, "rain-map-story.png"), png);
  await sharp(png).jpeg({ quality: 96, chromaSubsampling: "4:4:4" }).toFile(resolve(directory, "rain-map-story.jpg"));
  console.log(`${width}×${height} → ${directory}/rain-map-story.png (+ .jpg)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
