import { expect, test } from "@playwright/test";

test("catalogue and policy hubs do not repeat the editorial panel", async ({ page }) => {
  for (const path of ["/bolets", "/guies", "/bolets/infografia", "/equip-editorial"]) {
    await page.goto(path);
    await expect(page.locator(".editorial-panel")).toHaveCount(0);
  }
});

test("species profiles use a compact expandable credit", async ({ page }) => {
  await page.goto("/bolets/fals-rossinyol");

  const credit = page.locator(".editorial-panel--compact");
  await expect(credit).toContainText("Editorial, no micològica");
  expect(await credit.evaluate((panel) =>
    getComputedStyle(panel.previousElementSibling!).borderBottomWidth
  )).toBe("0px");
  await expect(credit.locator("details")).not.toHaveAttribute("open", "");
  await credit.locator("summary").click();
  await expect(credit.locator('a[target="_blank"]')).not.toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("safety pages retain the full treatment while map pages show provider credits", async ({ page }) => {
  await page.goto("/bolets-verinosos");
  await expect(page.locator(".editorial-panel:not(.editorial-panel--compact)")).toContainText("Editorial, no micològica");

  await page.goto("/map");
  await expect(page.locator(".editorial-panel")).toHaveCount(0);
  const dataCredits = page.locator(".data-source-credits");
  await expect(dataCredits).toContainText("Fonts de les dades del mapa");
  await expect(dataCredits).toContainText("Servei Meteorològic de Catalunya (Meteocat)");
});
