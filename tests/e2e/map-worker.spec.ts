import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block", extraHTTPHeaders: { DNT: "1" } });

for (const path of ["/map", "/bolets-avui"]) {
  test(`${path} starts functional same-origin MapLibre module workers`, async ({ page }) => {
    await page.addInitScript(() => {
      const state = { urls: [] as string[], errors: [] as string[], replies: 0 };
      Reflect.set(window, "workerCheck", state);
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          state.urls.push(String(url));
          this.addEventListener("error", (event) => state.errors.push(event.message));
          this.addEventListener("message", () => { state.replies++; });
        }
      };
    });
    await page.route("**/api/predictions?*", route => route.fulfill({ json: { cells: [], truncated: false } }));
    await page.goto(path);
    await expect(page.locator(".region-map")).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
    await expect.poll(() => page.evaluate(() => Reflect.get(window, "workerCheck").replies)).toBeGreaterThan(0);
    const state = await page.evaluate(() => Reflect.get(window, "workerCheck"));
    expect(state.errors).toEqual([]);
    expect(state.urls.length).toBeGreaterThan(0);
    for (const url of state.urls) {
      expect(url).toMatch(/^\/maplibre\/\d+\.\d+\.\d+\/maplibre-gl-worker\.mjs$/);
      const response = await page.request.get(url);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toMatch(/javascript/);
      expect(response.headers()["cache-control"]).toContain("immutable");
      const shared = await page.request.get(url.replace("-worker.mjs", "-shared.mjs"));
      expect(shared.status()).toBe(200);
      expect(shared.headers()["content-type"]).toMatch(/javascript/);
    }
  });
}

for (const path of ["/bolets/cep", "/bolets/pinetell"]) {
  test(`${path} prioritizes only its primary specimen image`, async ({ page }) => {
    await page.goto(path);
    const hero = page.locator(".specimen-photo");
    await expect(hero).toHaveAttribute("fetchpriority", "high");
    await expect(hero).not.toHaveAttribute("loading", "lazy");
    const preloads = page.locator('link[rel="preload"][as="image"]');
    await expect(preloads).toHaveCount(1);
    await expect(preloads).toHaveAttribute("fetchpriority", "high");
    await expect(preloads).toHaveAttribute("imagesrcset", /\/media\/optimized\//);
    for (const image of await page.locator(".species-gallery-thumbnails img").all()) {
      await expect(image).toHaveAttribute("loading", "lazy");
    }
    await page.getByRole("button", { name: "Fotografia següent" }).first().click();
    await expect(hero).toHaveAttribute("fetchpriority", "auto");
  });
}
