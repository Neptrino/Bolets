/**
 * Render the static topographic portrait of every documented place and area
 * from the ICGC WMS and commit the result. Existing files are kept unless
 * --force is passed; bump PLACE_MAP_VERSION in src/lib/place-map.ts when
 * reframing.
 *
 *   npm run maps:places -- [--force] [area | area/place ...]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { areaBounds, areaProfiles, areasBounds, areasBySlug, PIRINEU_AREA_SLUGS, placeProfiles } from "../data/location-pages.ts";
import {
  PLACE_MAP_BRIGHTNESS,
  PLACE_MAP_TINT,
  areaMapFilePath,
  areaMapSpec,
  hubMapUpstreamUrl,
  hubRegionMapFilePath,
  PIRINEU_MAP_SLUG,
  placeBannerSpec,
  placeMapFilePath,
  placeMapSpec,
  type HubMapSpec,
} from "../src/lib/place-map.ts";

type Job = { id: string; file: string; spec: HubMapSpec };

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = new Set(args.filter((arg) => !arg.startsWith("--")));
const jobs: Job[] = [
  ...areaProfiles.map((area) => ({ id: area.slug, file: areaMapFilePath(area), spec: areaMapSpec(areaBounds(area)) })),
  { id: PIRINEU_MAP_SLUG, file: hubRegionMapFilePath(PIRINEU_MAP_SLUG), spec: areaMapSpec(areasBounds(PIRINEU_AREA_SLUGS.map((slug) => areasBySlug[slug]))) },
  ...placeProfiles.flatMap((place) => [
    { id: `${place.areaSlug}/${place.slug}`, file: placeMapFilePath(place), spec: placeMapSpec(place) },
    { id: `${place.areaSlug}/${place.slug}`, file: placeMapFilePath(place, "banner"), spec: placeBannerSpec(place) },
  ]),
].filter((job) => only.size === 0 || only.has(job.id));
const CONCURRENCY = 3;

async function render(job: Job) {
  const output = join(process.cwd(), job.file);
  if (!force && existsSync(output)) return "kept";
  const upstream = await fetch(hubMapUpstreamUrl(job.spec), { signal: AbortSignal.timeout(30_000) });
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !contentType.startsWith("image/png")) {
    throw new Error(`ICGC returned ${upstream.status} ${contentType} for ${job.id}`);
  }
  const original = Buffer.from(await upstream.arrayBuffer());
  let pipeline = sharp(original, { limitInputPixels: job.spec.width * job.spec.height });
  // The grey base is warmed to the paper tone; the colour base is kept as ICGC draws it.
  if (job.spec.layer === "topografic-gris") pipeline = pipeline.tint(PLACE_MAP_TINT).modulate({ brightness: PLACE_MAP_BRIGHTNESS });
  const image = await pipeline.webp({ quality: 82, effort: 6 }).toBuffer();
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, image);
  return `${(image.byteLength / 1024).toFixed(0)} KB`;
}

let failures = 0;
const queue = [...jobs];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let job = queue.shift(); job; job = queue.shift()) {
    try {
      console.log(`${job.file}: ${await render(job)}`);
    } catch (error) {
      failures += 1;
      console.error(`${job.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}));
if (failures > 0) {
  console.error(`${failures} portrait(s) failed`);
  process.exit(1);
}
