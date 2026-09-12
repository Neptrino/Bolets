import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { rasterizePreparedHeatRaster, type PreparedHeatRaster } from "@/components/region-map/prediction-raster";

test.use({ serviceWorkers: "block", extraHTTPHeaders: { DNT: "1" } });

test("the map worker returns the exact shared raster pixels", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        const inputs = new Map<number, unknown>();
        const post = this.postMessage.bind(this);
        this.postMessage = (message, options?: StructuredSerializeOptions | Transferable[]) => {
          if (message?.prepared) inputs.set(message.id, message.prepared);
          post(message, Array.isArray(options) ? { transfer: options } : options);
        };
        this.addEventListener("message", async (event) => {
          if (!event.data?.raster?.pixels || Reflect.get(window, "rasterEvidence")) return;
          const hash = await crypto.subtle.digest("SHA-256", event.data.raster.pixels);
          Reflect.set(window, "rasterEvidence", {
            prepared: inputs.get(event.data.id),
            hash: [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join(""),
            url: String(url),
          });
        });
      }
    };
  });
  await page.route("**/api/predictions?*", route => route.fulfill({ json: {
    cells: [{ cellId: "worker-parity", gridSizeM: 2500, cellBounds: [[1.65, 42.15], [1.69, 42.18]], score: 61, habitatCoverage: 0.6 }],
    truncated: false,
  } }));
  await page.goto("/map/cep");
  await expect(page.locator(".region-map")).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => Boolean(Reflect.get(window, "rasterEvidence")))).toBe(true);
  const evidence = await page.evaluate(() => Reflect.get(window, "rasterEvidence")) as {
    prepared: PreparedHeatRaster; hash: string; url: string;
  };
  expect(evidence.url).toContain("/_next/static/");
  const expected = rasterizePreparedHeatRaster(evidence.prepared);
  expect(evidence.hash).toBe(createHash("sha256").update(expected.pixels).digest("hex"));
});
