import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block", extraHTTPHeaders: { DNT: "1" } });

test("Avui keeps offscreen map work deferred and loads its timeline on approach", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const mapRequests: string[] = [];
  page.on("request", request => {
    if (/\/api\/(predictions|map-tiles)|\/maplibre\/|\/icgc-bootstrap\//.test(request.url())) mapRequests.push(request.url());
  });
  await page.route(/\/api\/map-tiles\/|\/media\/optimized\/v\d+\/icgc-bootstrap\//, route => route.abort());
  await page.route("**/api/predictions?**", route => route.fulfill({ json: {
    cells: [{ cellId: "today-loading", gridSizeM: 2500, cellBounds: [[1.65, 42.15], [1.69, 42.18]], score: 61, habitatCoverage: 0.6 }],
    truncated: false,
  } }));
  await page.goto("/bolets-avui");
  await expect(page.locator(".current-map-placeholder")).toBeAttached();
  // Allow hydration and the real IntersectionObserver to run before asserting.
  await page.waitForTimeout(1500);
  expect(mapRequests).toEqual([]);
  const frame = page.locator(".current-map-frame");
  const before = await frame.boundingBox();
  await frame.scrollIntoViewIfNeeded();
  await expect(page.locator(".current-production-map")).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
  expect(mapRequests.some(url => url.includes("/api/predictions?"))).toBe(true);
  expect((await frame.boundingBox())?.height).toBe(before?.height);
  const timeline = page.getByRole("slider", { name: "Dia mostrat al mapa" });
  await timeline.focus();
  await timeline.press("ArrowRight");
  await expect(timeline).toHaveValue("1");
  await expect(page.locator(".prediction-timeline-heading")).toContainText("Demà");
  await expect(page.locator(".current-map-open")).toHaveAttribute("href", "/map");
});

for (const observerAvailable of [true, false]) test(`Avui starts a visible map automatically (observer: ${observerAvailable})`, async ({ page }) => {
  await page.setViewportSize({ width: 1350, height: 1080 });
  if (!observerAvailable) await page.addInitScript(() => { Reflect.deleteProperty(window, "IntersectionObserver"); });
  await page.route(/\/api\/map-tiles\/|\/media\/optimized\/v\d+\/icgc-bootstrap\//, route => route.abort());
  await page.route("**/api/predictions?**", route => route.fulfill({ json: { cells: [], truncated: false } }));
  await page.goto("/bolets-avui");
  await expect(page.locator(".current-production-map")).toBeAttached();
  await expect(page.getByRole("slider", { name: "Dia mostrat al mapa" })).toBeVisible();
});
