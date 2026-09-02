import { expect, test } from "@playwright/test";

test("automatic geolocation keeps the public grid and leaves finer zoom to the user", async ({ context, page }) => {
  const location = { longitude: 2.15, latitude: 41.39 };
  await page.setViewportSize({ width: 1280, height: 800 });
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(location);
  await page.route("**/api/me/contributor-access", (route) => route.fulfill({
    json: { authenticated: false, active: false, activeUntil: null, revokedAt: null },
  }));
  const requests: URL[] = [];
  await page.route("**/api/predictions?*", (route) => {
    requests.push(new URL(route.request().url()));
    return route.fulfill({ json: { cells: [], truncated: false } });
  });
  await page.goto("/map");
  await expect.poll(() => requests.some((url) =>
    url.searchParams.get("resolution") === "2500" &&
    Number(url.searchParams.get("west")) <= location.longitude &&
    Number(url.searchParams.get("east")) >= location.longitude &&
    Number(url.searchParams.get("south")) <= location.latitude &&
    Number(url.searchParams.get("north")) >= location.latitude,
  )).toBe(true);
  await expect(page.locator(".map-floating-card-label")).toContainText("Selecciona un sector");
  await expect(page.locator(".map-floating-card-label")).not.toContainText("Prepirineus");
  await expect(page.locator(".map-detail-access")).toHaveCount(0);
  expect(requests.every((url) => Number(url.searchParams.get("resolution")) >= 2500)).toBe(true);
  await page.getByRole("button", { name: "Apropar", exact: true }).click();
  await expect(page.locator(".map-detail-access")).toBeVisible();
});

test("detail invitation follows zoom and stays centered above the responsive footer", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route("**/api/me/contributor-access", (route) => route.fulfill({
    json: { authenticated: false, active: false, activeUntil: null, revokedAt: null },
  }));
  await page.goto("/map");
  const prompt = page.locator(".map-detail-access");
  await expect(page.getByRole("button", { name: "Apropar", exact: true })).toBeVisible();
  await expect(prompt).toHaveCount(0);
  let zoomSteps = 0;
  while (await prompt.count() === 0 && zoomSteps < 8) {
    await page.getByRole("button", { name: "Apropar", exact: true }).click();
    // MapLibre's navigation control animates each whole zoom step.
    await page.waitForTimeout(400);
    zoomSteps++;
  }
  await expect(prompt).toBeVisible();
  await expect(prompt.getByRole("link")).toHaveAttribute("href", "/col-labora");
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(prompt).toBeVisible();
    const box = await prompt.boundingBox();
    const footer = await page.locator(".map-detail-panel").boundingBox();
    const stage = await page.locator(".map-stage").boundingBox();
    expect(box).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(stage).not.toBeNull();
    expect(Math.abs(box!.x + box!.width / 2 - (stage!.x + stage!.width / 2))).toBeLessThan(2);
    expect(box!.y + box!.height).toBeLessThan(footer!.y - 8);
    expect(box!.x).toBeGreaterThanOrEqual(stage!.x + 12);
    expect(box!.x + box!.width).toBeLessThanOrEqual(stage!.x + stage!.width - 12);
    await page.screenshot({ path: test.info().outputPath(`detail-prompt-${viewport.width}.png`) });
  }
  await page.getByRole("button", { name: "Obre la informació del mapa", exact: true }).click();
  await expect(prompt).toHaveCount(0);
  await page.getByRole("button", { name: "Tanca la informació del mapa", exact: true }).click();
  await expect(prompt).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  while (zoomSteps-- > 0) {
    await page.getByRole("button", { name: "Allunyar", exact: true }).click();
    await page.waitForTimeout(400);
  }
  await expect(prompt).toHaveCount(0);
});
