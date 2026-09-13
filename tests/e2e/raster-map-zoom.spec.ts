import { expect, test } from "@playwright/test";
import sharp from "sharp";

test.use({ serviceWorkers: "block", extraHTTPHeaders: { DNT: "1" } });

for (const direction of ["in", "out"] as const) test(`keeps loaded geography visible while zooming ${direction} waits for new tiles`, async ({ page }) => {
  const tile = await sharp({ create: { width: 256, height: 256, channels: 3, background: "#638254" } }).png().toBuffer();
  let pause = false, pending = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/predictions?*", route => route.fulfill({ json: { cells: [], truncated: false } }));
  await page.route(/\/api\/map-tiles\/|\/media\/optimized\/v\d+\/icgc-bootstrap\//, async route => {
    if (pause) { pending++; await gate; }
    await route.fulfill({ contentType: "image/png", body: tile });
  });
  await page.goto("/map?region=prepirineus");
  const surface = page.locator(".raster-map-surface");
  await expect.poll(() => page.locator(".leaflet-tile").evaluateAll(tiles => tiles.length > 0 && tiles.every(tile => (tile as HTMLImageElement).complete))).toBe(true);
  const loaded = await page.locator(".leaflet-tile-loaded").count();
  expect(loaded).toBeGreaterThan(0);
  const before = await surface.screenshot();
  const { width, height } = await sharp(before).metadata();
  const sample = { left: Math.floor(width! / 2), top: Math.floor(height! * .4), width: 1, height: 1 };
  const expectedPixel = await sharp(before).extract(sample).removeAlpha().raw().toBuffer();
  pause = true;
  await surface.hover({ position: { x: 600, y: 300 } });
  await page.mouse.wheel(0, direction === "in" ? -180 : 60);
  try {
    await expect.poll(() => pending).toBeGreaterThan(0);
    const waiting = await surface.screenshot({ path: test.info().outputPath("waiting-for-zoom-tiles.png") });
    const actualPixel = await sharp(waiting).extract(sample).removeAlpha().raw().toBuffer();
    expect([...actualPixel].every((value, index) => Math.abs(value - expectedPixel[index]) <= 2)).toBe(true);
    expect(await page.locator(".leaflet-tile-loaded").count()).toBeGreaterThan(0);
  } finally { release(); }
  await expect.poll(() => page.locator(".leaflet-tile").evaluateAll(tiles => tiles.length > 0 && tiles.every(tile => (tile as HTMLImageElement).complete))).toBe(true);
});
