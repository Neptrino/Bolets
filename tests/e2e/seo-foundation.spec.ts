import { expect, test } from "@playwright/test";

test("permanently redirects legacy catalogue URLs and preserves query parameters", async ({ request }) => {
  const catalogue = await request.get("/species?region=pirineus", { maxRedirects: 0 });
  expect(catalogue.status()).toBe(308);
  expect(new URL(catalogue.headers().location!, "http://localhost").pathname).toBe("/bolets");
  expect(new URL(catalogue.headers().location!, "http://localhost").searchParams.get("region")).toBe("pirineus");

  const profile = await request.get("/species/boletus-edulis?region=pirineus", { maxRedirects: 0 });
  expect(profile.status()).toBe(308);
  const profileLocation = new URL(profile.headers().location!, "http://localhost");
  expect(profileLocation.pathname).toBe("/bolets/boletus-edulis");
  expect(profileLocation.searchParams.get("region")).toBe("pirineus");
});

for (const route of [
  "/bolets",
  "/bolets/boletus-edulis",
  "/bolets-avui",
  "/bolets-de-primavera",
  "/bolets-d-estiu",
  "/bolets-de-tardor",
  "/bolets-d-hivern",
  "/quan-surten-els-bolets-despres-de-ploure",
  "/equip-editorial",
  "/compare/rovello-vs-pinetell",
  "/temporada/setembre",
]) {
  test(`${route} has one H1, a self canonical and structured data`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await expect(page.locator('script[type="application/ld+json"]')).not.toHaveCount(0);
  });
}

test("every month in the season calendar links to its own canonical page", async ({ page }) => {
  await page.goto("/temporada");

  const calendar = page.getByRole("navigation", { name: "Calendari anual de la temporada de bolets" });
  await expect(calendar.getByRole("link")).toHaveCount(12);
  await calendar.getByRole("link", { name: /Temporada de bolets al setembre/ }).click();

  await expect(page).toHaveURL(/\/temporada\/setembre$/);
  await expect(page.locator("h1")).toContainText("Bolets de temporada");
  await expect(page.getByRole("link", { name: /Temporada de bolets al setembre/ })).toHaveAttribute("aria-current", "page");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/temporada\/setembre$/);
});

test("the catalogue separates monthly and seasonal navigation", async ({ page }) => {
  await page.goto("/bolets");

  await expect(page.getByRole("link", { name: /Per mesos/ })).toHaveAttribute("href", "/temporada");
  const seasons = page.getByRole("navigation", { name: "Bolets per estació de l’any" });
  await expect(seasons.getByRole("link")).toHaveCount(4);
  await expect(seasons.getByRole("link", { name: /Bolets de primavera/ })).toHaveAttribute("href", "/bolets-de-primavera");
  await expect(seasons.getByRole("link", { name: /Bolets d’estiu/ })).toHaveAttribute("href", "/bolets-d-estiu");
  await expect(seasons.getByRole("link", { name: /Bolets de tardor/ })).toHaveAttribute("href", "/bolets-de-tardor");
  await expect(seasons.getByRole("link", { name: /Bolets d’hivern/ })).toHaveAttribute("href", "/bolets-d-hivern");
});

test("internal navigation exposes no legacy catalogue link", async ({ page }) => {
  for (const route of ["/", "/bolets", "/bolets/boletus-edulis", "/map", "/compare/rovello-vs-pinetell"]) {
    await page.goto(route);
    await expect(page.locator('a[href^="/species"]'), route).toHaveCount(0);
  }
});

test("the current overview stays usable without publishing invented scores", async ({ page }) => {
  const response = await page.goto("/bolets-avui");
  expect(response?.status()).toBe(200);
  await expect(page.locator(".current-overview-card")).toHaveCount(6);
  expect((await page.locator(".current-overview-card").allTextContents()).join(" ")).not.toContain("NaN");
  const unpublished = page.locator(".current-overview-card.is-insufficient, .current-overview-card.is-unavailable");
  for (const card of await unpublished.all()) {
    await expect(card.locator(".current-score")).toHaveCount(0);
  }
});

test("safety-sensitive pages show editorial status and official escalation", async ({ page }) => {
  await page.goto("/bolets-verinosos");
  await expect(page.getByText("Revisió editorial; revisió micològica independent pendent")).toBeVisible();
  await expect(page.getByRole("link", { name: /guia de l’ACSA/i })).toHaveAttribute("href", /acsa\.gencat\.cat/);
  await expect(page.getByText(/061 Salut Respon/).first()).toBeVisible();

  await page.goto("/bolets/amanita-phalloides");
  await expect(page.locator(".species-official-safety")).toContainText("061 Salut Respon");
  await expect(page.locator(".editorial-panel")).toContainText("revisió micològica independent pendent");
});
