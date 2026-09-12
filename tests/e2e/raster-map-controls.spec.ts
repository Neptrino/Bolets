import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { basemapOptions } from "../../components/region-map/basemaps";

test.use({ serviceWorkers: "block", extraHTTPHeaders: { DNT: "1" } });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/predictions?*", route => route.fulfill({ json: { cells: [], truncated: false } }));
  const tile = await sharp({ create: { width: 256, height: 256, channels: 3, background: "#c4c4b4" } }).png().toBuffer();
  await page.route(/\/api\/map-tiles\/|geoserveis\.icgc\.cat|tile\.openstreetmap\.org|server\.arcgisonline\.com/, route =>
    route.fulfill({ contentType: "image/png", body: tile }));
});

test("renders the map shell on the server and initializes Leaflet only in the browser", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto("/map");
  const html = await response!.text();
  expect(html).toContain('class="region-map-surface"');
  expect(html).not.toContain("BAILOUT_TO_CLIENT_SIDE_RENDERING");
  await expect(page.locator(".raster-map-surface")).toBeVisible();
  await expect(page.locator(".region-map")).toHaveCount(1);
  await expect.poll(() => page.locator(".leaflet-tile-loaded").count()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("switches every raster basemap with attribution and without WebGL", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    Reflect.set(window, "webglContexts", 0);
    Reflect.set(HTMLCanvasElement.prototype, "getContext", function (this: HTMLCanvasElement, ...args: Parameters<typeof getContext>) {
      if (String(args[0]).includes("webgl")) Reflect.set(window, "webglContexts", Number(Reflect.get(window, "webglContexts")) + 1);
      return Reflect.apply(getContext, this, args);
    });
  });
  await page.goto("/map/cep");
  await expect(page.locator(".raster-map-surface")).toBeVisible();
  await expect(page.locator(".full-map")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "Mostra els controls del mapa", exact: true }).click();
  for (const option of basemapOptions) {
    await page.getByRole("radio", { name: `${option.label}: ${option.description}`, exact: true }).check();
    await expect(page.locator(".full-map")).toHaveAttribute("data-basemap", option.id);
    await expect.poll(() => page.locator(".leaflet-tile-loaded").count()).toBeGreaterThan(0);
    await expect(page.locator(".maplibregl-ctrl-attrib-inner")).toContainText(option.provider === "ICGC" ? "Institut Cartogràfic" : option.provider === "OSM" ? "OpenStreetMap" : "Esri");
  }
  expect(await page.evaluate(() => Reflect.get(window, "webglContexts"))).toBe(0);
  expect(errors).toEqual([]);
});

test("uniform raster tiles remain seamless at fractional zoom", async ({ page }) => {
  await page.goto("/map/cep?west=1.65&south=42.15&east=1.72&north=42.22");
  await expect.poll(() => page.locator(".leaflet-tile").evaluateAll(tiles => tiles.length > 0 && tiles.every(tile =>
    tile instanceof HTMLImageElement && tile.complete && tile.naturalWidth > 0))).toBe(true);
  const capture = await page.locator(".region-map-surface").screenshot({
    path: test.info().outputPath("uniform-tiles.png"),
    style: ".maplibregl-ctrl, .region-map-cells, .map-page-heading, .map-detail-panel { visibility: hidden !important; }",
  });
  const tileArea = await sharp(capture).extract({ left: 400, top: 180, width: 400, height: 250 }).toBuffer();
  const { channels } = await sharp(tileArea).stats();
  expect(channels.every(channel => channel.max - channel.min <= 2), JSON.stringify(channels)).toBe(true);
});

test("Escape exits fallback fullscreen and restores page scrolling", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(document, "fullscreenEnabled", { value: false }));
  await page.goto("/map/cep");
  const originalOverflow = await page.locator("body").evaluate(body => body.style.overflow);
  await page.getByRole("button", { name: "Veure el mapa a pantalla completa", exact: true }).click();
  await expect(page.locator(".maplibregl-pseudo-fullscreen")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sortir de pantalla completa", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".maplibregl-pseudo-fullscreen")).toHaveCount(0);
  expect(await page.locator("body").evaluate(body => body.style.overflow)).toBe(originalOverflow);
});

test("native fullscreen includes the map workspace and exits through its control", async ({ page }) => {
  await page.goto("/map/cep");
  await page.getByRole("button", { name: "Veure el mapa a pantalla completa", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.classList.contains("map-stage"))).toBe(true);
  await page.getByRole("button", { name: "Sortir de pantalla completa", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
});

test("manual pan stops location following without ending the watch", async ({ context, page }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ longitude: 2.17, latitude: 41.39 });
  await page.goto("/map/cep");
  const location = page.locator(".maplibregl-ctrl-geolocate");
  await expect(location).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".maplibregl-user-location-dot")).toBeVisible();
  await page.waitForTimeout(800);
  const surface = page.locator(".region-map-surface");
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 180, box.y + box.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect(location).toHaveAttribute("aria-pressed", "false");
  await page.waitForTimeout(800);
  const transform = () => page.locator(".leaflet-map-pane").evaluate(node => node.getAttribute("style"));
  const before = await transform();
  await context.setGeolocation({ longitude: 2.18, latitude: 41.4 });
  await page.waitForTimeout(800);
  expect(await transform()).toBe(before);
  await expect(location).toHaveClass(/maplibregl-ctrl-geolocate-background/);
});
