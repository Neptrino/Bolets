import { expect, test, type Page } from "@playwright/test";

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => expect(pageErrors.get(page)).toEqual([]));

// Isolated browser fixtures exercise access levels without granting an account
// privileges or requesting protected live cells. The server gates are unchanged.
async function prepare(page: Page, minimumResolutionM: 250 | 1000 | 2500, path = "/map/cep") {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    // A saved choice from the retired selector must not override automatic mode.
    localStorage.setItem("bolets-map-rendering", "cells");
    const prototype = CanvasRenderingContext2D.prototype;
    const fillRect = prototype.fillRect;
    const drawImage = prototype.drawImage;
    prototype.fillRect = function (...args) {
      if (this.canvas.classList.contains("region-map-cells")) Reflect.set(window, "predictionPaint", "cells");
      fillRect.apply(this, args);
    };
    prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      if (this.canvas.classList.contains("region-map-cells")) Reflect.set(window, "predictionPaint", "heatmap");
      Reflect.apply(drawImage, this, args);
    };
  });
  const access = { minimumResolutionM };
  await page.route("**/api/me/contributor-access", (route) => route.fulfill({ json: {
    authenticated: access.minimumResolutionM < 2500, active: access.minimumResolutionM < 2500,
    level: access.minimumResolutionM === 250 ? "contributor" : access.minimumResolutionM === 1000 ? "finding" : "public",
    minimumResolutionM: access.minimumResolutionM, activeUntil: null, revokedAt: null,
  } }));
  const resolutions: number[] = [];
  await page.route("**/api/predictions?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const gridSizeM = Number(params.get("resolution"));
    resolutions.push(gridSizeM);
    const longitude = 1.685, latitude = 42.185;
    const dx = gridSizeM / (111320 * Math.cos(latitude * Math.PI / 180)) / 2;
    const dy = gridSizeM / 110574 / 2;
    const inside = longitude >= Number(params.get("west")) && longitude <= Number(params.get("east"))
      && latitude >= Number(params.get("south")) && latitude <= Number(params.get("north"));
    return route.fulfill({ json: { truncated: false, cells: inside ? [{
      cellId: `fixture:${gridSizeM}`, gridSizeM, score: 50, habitatCoverage: 0.7,
      cellBounds: [[longitude - dx, latitude - dy], [longitude + dx, latitude + dy]],
    }] : [] } });
  });
  await page.goto(`${path}?west=1.65&south=42.15&east=1.72&north=42.22`);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "predictionPaint"))).toBe("heatmap");
  await page.getByRole("button", { name: "Mostra els controls del mapa", exact: true }).click();
  return { access, resolutions };
}

async function zoom(page: Page, direction: "Apropar" | "Allunyar") {
  await page.getByRole("button", { name: direction, exact: true }).click();
  // Wait for MapLibre's navigation animation to finish before the next step.
  await page.waitForTimeout(450);
}

async function expectDisplay(page: Page, rendering: "cells" | "heatmap") {
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "predictionPaint"))).toBe(rendering);
  await expect(page.locator(".region-map")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByText("Representació", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: /^(Superfície suavitzada|Sectors exactes):/ })).toHaveCount(0);
}

test("public smoothing ignores the retired preference and stays on 2.5 km at close zoom", async ({ page }) => {
  const { resolutions } = await prepare(page, 2500);
  await zoom(page, "Apropar");
  await zoom(page, "Apropar");
  await expectDisplay(page, "heatmap");
  expect(resolutions.every((size) => size === 2500)).toBe(true);
});

test("1 km access switches to cells and restores smoothing on zoom-out", async ({ page }) => {
  const { resolutions } = await prepare(page, 1000);
  await zoom(page, "Apropar");
  await expectDisplay(page, "cells");
  await zoom(page, "Apropar");
  await expectDisplay(page, "cells");
  expect(resolutions).toContain(1000);
  expect(resolutions).not.toContain(250);
  await page.screenshot({ path: test.info().outputPath("automatic-1km.png") });
  await zoom(page, "Allunyar");
  await zoom(page, "Allunyar");
  await expectDisplay(page, "heatmap");
});

test("fine access reaches 250 m and returns to public smoothing if access expires", async ({ page }) => {
  const { access, resolutions } = await prepare(page, 250);
  await zoom(page, "Apropar");
  await expectDisplay(page, "cells");
  await zoom(page, "Apropar");
  await expectDisplay(page, "cells");
  expect(resolutions).toContain(250);
  await page.screenshot({ path: test.info().outputPath("automatic-250m.png") });
  access.minimumResolutionM = 2500;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expectDisplay(page, "heatmap");
});

test("combined map retains its 1 km floor for fine-access users", async ({ page }) => {
  const { resolutions } = await prepare(page, 250, "/map");
  await zoom(page, "Apropar");
  await zoom(page, "Apropar");
  await expectDisplay(page, "cells");
  expect(resolutions).toContain(1000);
  expect(resolutions).not.toContain(250);
});
