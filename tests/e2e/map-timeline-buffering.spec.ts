import { expect, test } from "@playwright/test";

test.use({ extraHTTPHeaders: { DNT: "1" }, serviceWorkers: "block" });

test("Avui buffers tomorrow before selection and plays it without refetching", async ({ page }) => {
  const counts = new Map<string, number>();
  await page.route("**/api/predictions?**", async (route) => {
    const url = new URL(route.request().url());
    const offset = url.searchParams.get("time") ?? "0";
    counts.set(offset, (counts.get(offset) ?? 0) + 1);
    await route.fulfill({ json: {
      cells: [{ cellId: "buffered-cell", gridSizeM: Number(url.searchParams.get("resolution")),
        cellBounds: [[1.5, 42], [1.56, 42.05]], score: 50, habitatCoverage: 100, topSpeciesId: "boletus-edulis" }],
      truncated: false,
    } });
  });
  await page.goto("/bolets-avui");
  const timeline = page.getByRole("region", { name: "Evolució i previsió del mapa" });
  const slider = timeline.getByRole("slider");
  await expect(slider).toHaveValue("0", { timeout: 30_000 });
  // A day-two request means every day-one bucket has completed preloading.
  await expect.poll(() => counts.get("2") ?? 0, { timeout: 30_000 }).toBeGreaterThan(0);
  const tomorrowRequests = counts.get("1");
  expect(tomorrowRequests).toBeGreaterThan(0);
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  await expect(timeline.getByLabel("Carregant el fotograma")).toHaveCount(0);
  await expect(timeline).toContainText("Demà");
  expect(counts.get("1")).toBe(tomorrowRequests);
  await expect(page.locator(".region-map")).toHaveAttribute("aria-busy", "false");
});
