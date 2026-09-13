import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ICGC_BOOTSTRAP_KEYS, ICGC_BOOTSTRAP_VERSION } from "../../src/lib/icgc-bootstrap";

test.use({ viewport: { width: 412, height: 823 }, serviceWorkers: "block", extraHTTPHeaders: { DNT: "1" } });

test("loads the opening map from static build assets and keeps live tiles for zooming", async ({ page }) => {
  const errors: string[] = [];
  const apiTiles: string[] = [];
  const staticTiles = new Map<string, Promise<Buffer>>();
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    const key = response.url().split(`/icgc-bootstrap/${ICGC_BOOTSTRAP_VERSION}/`)[1]?.replace(/\.webp$/, "");
    if (key) staticTiles.set(key, response.body());
  });
  await page.route("**/api/predictions?*", route => route.fulfill({ json: { cells: [], truncated: false } }));
  // No map-provider network is needed to establish the opening view. Later zooms
  // keep the normal route; return a real tile to check their renderer as well.
  const fallback = await readFile(join(process.cwd(), "data/icgc-bootstrap", ICGC_BOOTSTRAP_VERSION, "references/7/64/47.webp"));
  await page.route("**/api/map-tiles/icgc/**", route => {
    apiTiles.push(route.request().url());
    return route.fulfill({ contentType: "image/webp", body: fallback });
  });
  await page.goto("/map");
  await expect(page.locator(".raster-map-surface")).toBeVisible();
  await expect.poll(() => page.locator(".leaflet-tile").evaluateAll(tiles =>
    tiles.length === 18 && tiles.every(tile => (tile as HTMLImageElement).complete && (tile as HTMLImageElement).naturalWidth === 256),
  )).toBe(true);
  expect(apiTiles).toEqual([]);
  expect([...staticTiles.keys()].sort()).toEqual([...ICGC_BOOTSTRAP_KEYS].sort());
  for (const [key, body] of staticTiles)
    expect(await body).toEqual(await readFile(join(process.cwd(), "data/icgc-bootstrap", ICGC_BOOTSTRAP_VERSION, `${key}.webp`)));
  // Mobile intentionally hides the zoom buttons; use the map's zoom gesture.
  await page.locator(".raster-map-surface").dblclick({ position: { x: 210, y: 220 } });
  await expect.poll(() => apiTiles.some(url => /\/(relief|references)\/8\//.test(url))).toBe(true);
  await expect.poll(() => page.locator('.leaflet-tile-loaded[src*="/api/map-tiles/"]').count()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
