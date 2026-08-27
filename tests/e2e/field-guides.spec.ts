import { expect, test } from "@playwright/test";

const routes = ["/bolets-de-soca", "/fals-rossinyol", "/normativa-bolets"];

for (const viewport of [{ width: 1280, height: 900 }, { width: 800, height: 900 }, { width: 390, height: 844 }]) {
  for (const route of routes) {
    test(`${route} fits at ${viewport.width}px and preserves indexing policy`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const response = await page.goto(route);
      expect(response?.ok()).toBe(true);
      await expect(page.locator("[data-page-shell]")).toHaveCount(1);
      await expect(page.locator("[data-page-header]")).toHaveAttribute("data-layout", "split");
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const cards = await page.locator(".seo-guide-grid section, .species-grid .species-card").all();
      const boxes = await Promise.all(cards.map(card => card.boundingBox()));
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!;
          const b = boxes[j]!;
          expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
        }
      }
      const robots = await page.locator('meta[name="robots"]').getAttribute("content");
      expect(robots).not.toContain("noindex");
      if (route === "/normativa-bolets") {
        await expect(page.locator('footer a[href="/normativa-bolets"]')).toBeVisible();
        await expect(page.getByRole("region", { name: "Bosc de Virós", exact: true })).toContainText("5 € per persona i dia, màxim 15 kg");
        await expect(page.getByRole("region", { name: "Vall d’Esterri de Cardós", exact: true })).toContainText("3 € per persona i dia, màxim 10 kg");
        await expect(page.locator('#collecting-fees, a[href="#collecting-fees"]')).toHaveCount(0);
        const costSection = page.getByRole("region", { name: "Cal pagar per collir bolets?", exact: true });
        await expect(costSection).toContainText("gratuïta, però hi ha espais amb tiquet de pagament");
        await expect(costSection).not.toContainText("€");
        for (const href of ["#collecting-local-rules", "#collecting-cost", "#collecting-groups", "#collecting-checks", "#collecting-viros", "#collecting-esterri"]) {
          await page.locator(`a[href="${href}"]`).click();
          await expect(page.locator(href)).toBeInViewport();
        }
      } else {
        await expect(page.getByRole("complementary", { name: "Abast de la guia" })).toBeVisible();
      }
      await expect(page.locator(".editorial-panel")).toContainText("sense revisió micològica independent");
      if (route === "/fals-rossinyol") {
        const related = page.getByRole("region", { name: "Fitxes per comparar", exact: true });
        const grid = related.locator(".species-grid");
        await expect(grid.locator(".species-card")).toHaveCount(3);
        await expect(related).not.toContainText("encara no té fitxa pròpia");
        await expect(grid.locator('[aria-label="Advertiment de consum: No recomanat"]')).toBeVisible();
        await expect(grid.locator('[aria-label="Advertiment de consum: Tòxic"]')).toBeVisible();
        // Compare the settled layout, not the cards' staggered entrance animation.
        await grid.evaluate(element => Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished)));
        const gridBox = (await grid.boundingBox())!;
        const firstCard = (await grid.locator(".species-card").first().boundingBox())!;
        const lastCard = (await grid.locator(".species-card").last().boundingBox())!;
        if (viewport.width > 1000) {
          expect(Math.abs(firstCard.y - lastCard.y)).toBeLessThanOrEqual(1);
          expect(firstCard.width).toBeGreaterThan(gridBox.width * 0.3);
          expect(Math.abs(lastCard.x + lastCard.width - gridBox.x - gridBox.width)).toBeLessThanOrEqual(1);
        } else if (viewport.width > 580) {
          expect(lastCard.y).toBeGreaterThanOrEqual(firstCard.y + firstCard.height);
          expect(firstCard.width).toBeGreaterThan(gridBox.width * 0.45);
        } else {
          expect(lastCard.y).toBeGreaterThanOrEqual(firstCard.y + firstCard.height);
          expect(Math.abs(firstCard.width - gridBox.width)).toBeLessThanOrEqual(1);
        }
        for (const name of ["Fals rossinyol", "Rossinyol", "Bolet d’olivera"]) {
          const card = related.getByRole("link", { name: `Obriu la fitxa de ${name}`, exact: true });
          await card.scrollIntoViewIfNeeded();
          await expect(card.locator("img")).toHaveJSProperty("complete", true);
          await expect(card.locator("img")).not.toHaveJSProperty("naturalWidth", 0);
          const href = await card.getAttribute("href");
          await card.click();
          await expect(page).toHaveURL(new RegExp(`${href}$`));
          await expect(page.locator("h1")).toContainText(name);
          await page.goBack();
        }
      }
      if (route === "/bolets-de-soca") {
        await expect(page.locator(".species-grid .species-card")).toHaveCount(4);
        await page.getByRole("link", { name: "Obriu la fitxa de Gírgola", exact: true }).click();
        await expect(page).toHaveURL(/\/bolets\/pleurotus-ostreatus$/);
        await expect(page.locator("h1")).toContainText("Gírgola");
      }
    });
  }
}

test("catalogue links to both editorial field guides", async ({ page }) => {
  await page.goto("/bolets");
  for (const route of ["/bolets-de-soca", "/fals-rossinyol"]) {
    const link = page.locator(`main a[href="${route}"]`).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.locator("h1")).toBeVisible();
    await page.goBack();
  }
});
