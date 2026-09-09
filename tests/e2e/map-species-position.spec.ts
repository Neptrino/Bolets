import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

test.use({ geolocation: { longitude: 2.1734, latitude: 41.3851 }, permissions: ["geolocation"] });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const watchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);
    navigator.geolocation.watchPosition = (...args) => {
      Reflect.set(window, "geolocationStarts", Number(Reflect.get(window, "geolocationStarts") ?? 0) + 1);
      return watchPosition(...args);
    };
  });
  await page.route("**/api/predictions?*", (route) => route.fulfill({ json: { cells: [], truncated: false } }));
  await page.route("**/api/me/contributor-access", (route) => route.fulfill({ json: {
    authenticated: false, active: false, level: "public", minimumResolutionM: 2500,
    activeUntil: null, revokedAt: null,
  } }));
  // A deterministic geographic tile pattern makes camera comparison independent
  // of remote basemap availability. Position and scale both affect the pixels.
  await page.route("**/api/map-tiles/icgc/**", async (route) => {
    const [, x, y] = new URL(route.request().url()).pathname.split("/").slice(-3).map(Number);
    const body = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <rect width="256" height="256" fill="rgb(${x % 200},${y % 200},130)"/>
      <path d="M0 0H256V256H0Z M0 100H256 M100 0V256" fill="none" stroke="white" stroke-width="4"/>
      <circle cx="180" cy="160" r="30" fill="black"/>
    </svg>`)).png().toBuffer();
    await route.fulfill({ contentType: "image/png", body });
  });
});

async function settled(page: Page) {
  await expect(page.locator(".region-map")).toHaveAttribute("aria-busy", "false");
  await page.waitForTimeout(800); // Includes the map's 650 ms location animation.
}

async function pixels(page: Page, name = "before") {
  return sharp(await page.locator(".maplibregl-canvas").screenshot({
    path: test.info().outputPath(`${name}.png`),
    style: `.map-page-heading, .maplibregl-ctrl, .maplibregl-marker, nextjs-portal, .region-map-cells,
      .map-detail-panel, .map-reset-button, .map-layer-controls { visibility: hidden !important; }`,
  })).removeAlpha().raw().toBuffer();
}

async function expectSameCamera(page: Page, before: Buffer) {
  await settled(page);
  const after = await pixels(page, "after");
  expect(after.length).toBe(before.length);
  let changed = 0;
  for (let index = 0; index < before.length; index++) {
    if (Math.abs(before[index] - after[index]) > 10) changed++;
  }
  expect(changed / before.length).toBeLessThan(0.005);
}

async function panAndZoom(page: Page) {
  await page.getByRole("button", { name: "Apropar", exact: true }).click();
  await settled(page);
  const box = (await page.locator(".maplibregl-canvas").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 180, box.y + box.height / 2 + 100, { steps: 15 });
  await page.mouse.up();
  await settled(page);
}

async function selectSpecies(page: Page, name: string) {
  await page.locator(".map-page-heading > summary").click();
  await page.getByRole("combobox", { name: "Espècie seleccionada", exact: true }).fill(name);
  await page.getByRole("option", { name, exact: true }).click();
}

test("preserves the panned and zoomed view across species pages without restarting geolocation", async ({ page }) => {
  await page.goto("/map");
  await expect(page.locator(".maplibregl-user-location-dot")).toBeVisible();
  await settled(page);
  await panAndZoom(page);
  const before = await pixels(page);
  const geolocationStarts = await page.evaluate(() => Reflect.get(window, "geolocationStarts"));
  expect(geolocationStarts).toBeGreaterThan(0);

  await selectSpecies(page, "Cep");
  await expect(page).toHaveURL(/\/map\/cep$/);
  await expectSameCamera(page, before);
  await selectSpecies(page, "Pinetell");
  await expect(page).toHaveURL(/\/map\/pinetell$/);
  await expectSameCamera(page, before);

  expect(await page.evaluate(() => Reflect.get(window, "geolocationStarts"))).toBe(geolocationStarts);
});

test("preserves a browsed territorial window when changing species", async ({ page }) => {
  await page.goto("/map/cep?west=1.65&south=42.15&east=1.72&north=42.22");
  await settled(page);
  await panAndZoom(page);
  const before = await pixels(page);
  await selectSpecies(page, "Pinetell");
  await expect(page).toHaveURL(/\/map\/pinetell\?/);
  await expectSameCamera(page, before);
  await expect(page.locator(".maplibregl-user-location-dot")).toHaveCount(0);
  await page.locator(".map-page-heading > summary").click();
  await page.getByRole("navigation", { name: "Mapes ràpids per espècie" })
    .getByRole("link", { name: "Cep", exact: true }).click();
  await expect(page).toHaveURL(/\/map\/cep$/);
  await expectSameCamera(page, before);
  expect(await page.evaluate(() => Reflect.get(window, "geolocationStarts"))).toBeUndefined();
});
