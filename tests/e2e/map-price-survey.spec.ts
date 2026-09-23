import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("the closed survey has no public entry point or submission form", async ({ page }) => {
  await page.goto("/map");
  await expect(page.getByRole("complementary", { name: "Enquesta sobre el mapa detallat" })).toHaveCount(0);

  await page.goto("/enquesta-mapa");
  await expect(page.locator("h1")).toContainText("L’enquesta de preu del mapa s’ha tancat");
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect(page.locator("meta[name=robots]")).toHaveAttribute("content", /noindex/);

  const response = await page.request.post("/api/map-price-survey", {
    data: { version: "map-price-v8", answer: "499" },
  });
  expect(response.status()).toBe(410);
  await expect(response.json()).resolves.toEqual({ error: "L’enquesta de preu del mapa s’ha tancat." });
});
