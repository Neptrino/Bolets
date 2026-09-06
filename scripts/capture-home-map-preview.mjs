import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { isIP } from "node:net";
import { promisify } from "node:util";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";
import { createServer } from "vite";

// Local illustration: use public habitat geometry with a fictional seasonal
// response. Never fetch prediction buckets or present this as current data.
// Run against a local dev server: node scripts/capture-home-map-preview.mjs
// Refresh the saved public habitat sample with HOME_MAP_REFRESH_HABITAT=1.
// HOME_MAP_HABITAT_IP may supply a verified public DNS answer for bolets.app
// when the local resolver intercepts it. curl still verifies HTTPS normally.
const baseUrl = new URL(process.env.TOUR_BASE_URL ?? "http://127.0.0.1:3101");
if (!["127.0.0.1", "localhost", "[::1]"].includes(baseUrl.hostname)) {
  throw new Error("The simulated homepage capture requires a local server.");
}
const output = resolve("public/media/editorial/home-map-simulated.webp");
const samplePath = resolve("artifacts/home-map-preview/habitat-v1.json");
const sampleSpecies = ["boletus-edulis", "lactarius-deliciosus"];
const runFile = promisify(execFile);

async function readHabitat(path) {
  const publicIp = process.env.HOME_MAP_HABITAT_IP;
  if (publicIp) {
    if (!isIP(publicIp)) throw new Error("Invalid public habitat IP address.");
    const { stdout } = await runFile("curl", [
      "--fail", "--silent", "--show-error", "--max-time", "30",
      "--resolve", `bolets.app:443:${publicIp}`, new URL(path, "https://bolets.app").href,
    ], { maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(stdout);
  }
  const response = await fetch(new URL(path, baseUrl), { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Habitat sample failed: ${response.status} ${path}`);
  return response.json();
}

async function habitatSample() {
  if (process.env.HOME_MAP_REFRESH_HABITAT !== "1") {
    try {
      return JSON.parse(await readFile(samplePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const loader = await createServer({
    root: process.cwd(), logLevel: "error", appType: "custom",
    server: { middlewareMode: true }, resolve: { alias: { "@": process.cwd() } },
  });
  let requests;
  try {
    const { bucketsForBounds } = await loader.ssrLoadModule("/src/lib/map-query.ts");
    const { habitatBucketUrl } = await loader.ssrLoadModule("/src/lib/map-request-url.ts");
    const { cataloniaMapBounds: [[west, south], [east, north]] } =
      await loader.ssrLoadModule("/src/lib/map-view-bounds.ts");
    const bounds = { west, south, east, north };
    requests = sampleSpecies.flatMap(speciesId =>
      bucketsForBounds(bounds, 2500, bounds).map(bucket => ({
        speciesId, path: habitatBucketUrl(bucket, speciesId, 2500),
      })),
    );
  } finally {
    await loader.close();
  }
  const sample = new Map();
  for (const { path, speciesId } of requests) {
    const result = await readHabitat(path);
    if (result.truncated || !Array.isArray(result.cells)) throw new Error(`Incomplete habitat: ${path}`);
    for (const cell of result.cells) {
      const coverage = cell.altitudeWeightedCoverage;
      if (!Number.isFinite(coverage) || coverage < 0 || coverage > 1) {
        throw new Error(`Invalid habitat coverage: ${cell.cellId}`);
      }
      if (!sample.has(cell.cellId) || sample.get(cell.cellId).coverage < coverage) {
        sample.set(cell.cellId, { cellId: cell.cellId, cellBounds: cell.cellBounds, coverage, speciesId });
      }
    }
  }
  if (!sample.size) throw new Error("No verified habitat cells returned.");
  const result = { capturedAt: new Date().toISOString(), species: sampleSpecies, requests, cells: [...sample.values()] };
  await mkdir(resolve("artifacts/home-map-preview"), { recursive: true });
  await writeFile(samplePath, JSON.stringify(result));
  return result;
}

const sample = await habitatSample();
// Show a subset of well-covered habitat in this illustration; sparse habitat
// remains unpainted. The display threshold is NOT a production habitat gate.
// Actual coverage attenuates the fictional response. Neither this response nor
// this sample changes the prediction model or represents observed weather.
const cells = sample.cells.filter(({ coverage }) => coverage >= 0.4).map(({ cellId, cellBounds, coverage, speciesId }) => {
  const [[west, south], [east, north]] = cellBounds;
  const lon = (west + east) / 2;
  const lat = (south + north) / 2;
  const response = Math.min(92, Math.max(30,
    72 + 12 * Math.sin(lon * 4 + lat * 2) + 8 * Math.cos(lat * 7 - lon * 2),
  ));
  return {
    cellId, cellBounds, gridSizeM: 2500,
    score: Math.round(response * coverage),
    habitatCoverage: coverage, topSpeciesId: speciesId,
  };
});
console.log(`Using ${cells.length} real habitat cells sampled on ${sample.capturedAt}.`);

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
    deviceScaleFactor: 1,
    locale: "ca-ES",
    timezoneId: "Europe/Madrid",
    serviceWorkers: "block",
    extraHTTPHeaders: { DNT: "1" },
  });
  await context.route("https://analytics.bolets.app/**", route => route.abort());
  await context.route("**/api/predictions?*", route => {
    const query = new URL(route.request().url()).searchParams;
    const west = Number(query.get("west"));
    const east = Number(query.get("east"));
    const south = Number(query.get("south"));
    const north = Number(query.get("north"));
    const matching = cells.filter(({ cellBounds: [[x, y]] }) =>
      x >= west && x < east && y >= south && y < north,
    );
    return route.fulfill({ json: { cells: matching, truncated: false } });
  });
  const page = await context.newPage();
  await page.goto(new URL("/bolets-avui", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: `
    .current-map-frame { height: 800px; min-height: 800px; }
    .current-map-overview { width: 1102px; max-width: none; }
    .current-map-overview .prediction-timeline { display: none; }
    .current-map-overview .maplibregl-ctrl-bottom-right { bottom: 0; }
    nextjs-portal { display: none; }
  ` });
  const map = page.locator(".current-production-map");
  await map.scrollIntoViewIfNeeded();
  await expect(map.locator(".maplibregl-canvas")).toBeVisible();
  await expect(map).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
  await expect.poll(() => map.locator(".region-map-cells").evaluate(canvas => {
    const context = canvas.getContext("2d");
    return context.getImageData(0, 0, canvas.width, canvas.height).data
      .some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);
  // Raster tiles settle independently of the fixture's completed bucket run.
  await page.waitForTimeout(2500);
  await mkdir(resolve("public/media/editorial"), { recursive: true });
  const capture = await map.screenshot({ animations: "disabled" });
  await sharp(capture).webp({ quality: 88 }).toFile(output);
  console.log(`Saved Avui renderer with simulated conditions: ${output}`);
} finally {
  await browser.close();
}
