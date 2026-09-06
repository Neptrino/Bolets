import { expect, test } from "@playwright/test";

for (const width of [320, 390, 1280]) {
  test(`annual calendar remains readable and navigable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/temporada");
    await page.getByRole("link", { name: "Veure el calendari anual ↓" }).click();
    const region = page.getByRole("region", { name: "Taula del calendari anual" });
    await expect(region).toBeVisible();
    await expect(region.getByRole("columnheader")).toHaveCount(width <= 680 ? 2 : 13);
    await expect(region.locator("thead [aria-current=page]")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await region.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
    if (width <= 680) {
      expect(await region.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }

    const firstSpecies = region.locator("tbody th").first();
    const before = await firstSpecies.boundingBox();
    await region.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    const after = await firstSpecies.boundingBox();
    expect(Math.abs(after!.x - before!.x)).toBeLessThan(2);
    if (width <= 680) {
      await page.getByRole("navigation", { name: "Calendari anual de la temporada de bolets" })
        .getByRole("link", { name: /Temporada de bolets al desembre:/ }).click();
    } else {
      await region.getByRole("link", { name: "Bolets al desembre", exact: false }).click();
    }
    await expect(page).toHaveURL(/\/temporada\/desembre$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/temporada\/desembre$/);
    await expect(region).toBeVisible();
    await expect(region.locator("thead [aria-current=page]")).toHaveAttribute("href", "/temporada/desembre");
    const calendarBottom = await page.locator("#calendari-anual").evaluate((element) => element.getBoundingClientRect().bottom);
    const noteTop = await page.locator(".season-explainer").evaluate((element) => element.getBoundingClientRect().top);
    expect(noteTop).toBeGreaterThanOrEqual(calendarBottom);

    if (width <= 680) {
      const switcher = page.getByRole("navigation", { name: "Canvia el mes de la taula" });
      await switcher.getByRole("link", { name: "Mes següent: gener" }).click();
      await expect(page).toHaveURL(/\/temporada\/gener#calendari-anual$/);
      await expect(region.locator("thead [aria-current=page]")).toHaveAttribute("href", "/temporada/gener");
      await expect(region.getByRole("columnheader")).toHaveCount(2);
      await switcher.getByRole("link", { name: "Mes anterior: desembre" }).click();
      await expect(page).toHaveURL(/\/temporada\/desembre#calendari-anual$/);
    }

    await page.getByRole("navigation", { name: "Calendari anual de la temporada de bolets" })
      .getByRole("link", { name: /Temporada de bolets al setembre:/ }).click();
    await expect(page).toHaveURL(/\/temporada\/setembre$/);
    await expect(region).toBeVisible();
    await expect(region.locator("thead [aria-current=page]")).toHaveAttribute("href", "/temporada/setembre");
  });
}
