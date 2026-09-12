import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("home defers destination assets and video media until intent", async ({ page }) => {
  const prefetched: string[] = [];
  const media: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.searchParams.has("_rsc")) prefetched.push(url.pathname);
    if (/home-showcase\.(mp4|webm)/.test(url.pathname)) media.push(url.pathname);
  });
  await page.goto("/");
  await expect(page.locator(".home-showcase-cover")).toBeAttached();
  // Allow Next's viewport prefetch queue to run before checking idle behavior.
  await page.waitForTimeout(1500);
  expect(prefetched).not.toContain("/joc");
  expect(prefetched).not.toContain("/bolets-avui");
  expect(prefetched).not.toContain("/map");
  expect(media).toEqual([]);
  await expect(page.locator(".home-showcase-player video")).toHaveAttribute("preload", "none");
  await expect(page.locator(".home-showcase-player video")).toHaveAttribute("poster", /\/media\/optimized\/.*\.w640\.webp$/);
  await page.locator('.primary-nav a[href="/bolets-avui"]').focus();
  await expect.poll(() => prefetched.includes("/bolets-avui")).toBe(true);
  await page.locator('.primary-nav a[href="/bolets-avui"]').click();
  await expect(page).toHaveURL(/\/bolets-avui$/);
});

test("map paints intermediate cells before the remaining buckets finish", async ({ page }) => {
  let releaseFirst!: () => void;
  const first = new Promise<void>((resolve) => { releaseFirst = resolve; });
  let release!: () => void;
  const remaining = new Promise<void>((resolve) => { release = resolve; });
  let count = 0;
  // The prediction overlay must work independently of the external basemap.
  await page.route("**/api/map-tiles/icgc/**", (route) => route.abort());
  await page.route("**/api/predictions?**", async (route) => {
    const index = count++;
    await (index === 0 ? first : remaining);
    const url = new URL(route.request().url());
    await route.fulfill({ json: {
      cells: [{ cellId: `progress-${index}`, gridSizeM: Number(url.searchParams.get("resolution")),
        cellBounds: index === 0 ? [[1.5, 42], [1.56, 42.05]] : [[1.7, 42], [1.76, 42.05]], score: 50, habitatCoverage: 100,
        topSpeciesId: "boletus-edulis" }],
      truncated: false,
    } });
  });
  try {
    await page.goto("/map");
    await expect.poll(() => count).toBeGreaterThan(1);
    const paintedPixels = () => page.locator(".region-map-cells").evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) count++;
      return count;
    });
    const initialPixels = await paintedPixels();
    releaseFirst();
    await expect.poll(paintedPixels).toBeGreaterThan(initialPixels);
    const partialPixels = await paintedPixels();
    await expect(page.locator(".region-map")).toHaveAttribute("aria-busy", "true");
    release();
    await expect(page.locator(".region-map")).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
    await expect.poll(paintedPixels).toBeGreaterThan(partialPixels);
  } finally { releaseFirst(); release(); }
});
