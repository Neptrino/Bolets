import { expect, test } from "@playwright/test";
import { seasonGuideForMonth } from "@/src/lib/season-guides";
import { monthInTimeZone } from "@/src/lib/seasonality";

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
  "/zones",
  "/guies",
  "/zones/rovellons",
  "/zones/ceps",
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

test("the footer links to the current Catalonia season", async ({ page }) => {
  const currentGuide = seasonGuideForMonth(monthInTimeZone());
  await page.goto("/temporada");

  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: currentGuide.cardTitle })).toHaveAttribute("href", currentGuide.path);
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
  const cards = page.locator(".current-overview-card");
  const cardCount = await cards.count();
  expect(cardCount).toBeLessThanOrEqual(10);
  await expect(page.locator("body")).not.toContainText(/Model ecologia-v/i);
  expect((await cards.allTextContents()).join(" ")).not.toContain("NaN");
  if (cardCount === 0) {
    await expect(page.locator(".current-board-empty")).toBeVisible();
  } else {
    for (const card of await cards.all()) {
      await expect(card.locator(".current-score")).toHaveCount(1);
      const speciesLink = card.locator(".current-row-species-link");
      const mapLink = card.locator(".current-row-map");
      await expect(speciesLink).toHaveCount(1);
      await expect(speciesLink).toHaveAttribute("href", /^\/bolets\/[a-z0-9-]+$/);
      await expect(mapLink).toHaveCount(1);
      await expect(mapLink).toContainText("Veure mapa");

      const speciesHref = await speciesLink.getAttribute("href");
      const mapHref = await mapLink.getAttribute("href");
      const mapUrl = new URL(mapHref!, "http://localhost");
      expect(mapUrl.pathname).toBe("/map");
      expect(mapUrl.searchParams.get("species")).toBe(speciesHref?.split("/").at(-1));
      expect(mapUrl.searchParams.get("region")).toBeTruthy();
    }

    const leader = page.locator(".current-leader:not(.current-leader-empty)");
    await expect(leader.locator(".current-leader-species-link")).toHaveAttribute("href", /^\/bolets\/[a-z0-9-]+$/);
    await expect(leader.locator(".current-leader-link")).toContainText("Veure al mapa");
  }
});

test("the zones directory lists every prediction region with representative species", async ({ page }) => {
  const response = await page.goto("/zones");
  expect(response?.status()).toBe(200);

  const list = page.locator("[data-prediction-zone-list]");
  const cards = list.locator(".prediction-zone-card");
  await expect(cards).toHaveCount(9);
  await expect(cards.locator(".prediction-zone-species a")).toHaveCount(45);
  await expect(cards.locator(".prediction-zone-count")).toHaveCount(9);
  await expect(page.locator("[data-local-guide-list]")).toHaveCount(0);

  const expectedRegions = [
    ["pirineus", "Pirineus"],
    ["prepirineus", "Prepirineus"],
    ["emporda", "Empordà"],
    ["catalunya-central", "Catalunya Central"],
    ["muntanyes-interiors", "Sistemes interiors"],
    ["montseny", "Montseny"],
    ["serralades-costeres", "Serralades Costeres"],
    ["serralades-prelitorals", "Serralades Prelitorals"],
    ["ports", "Ports"],
  ] as const;

  for (const [regionId, label] of expectedRegions) {
    const card = list.locator(`.prediction-zone-card[data-region="${regionId}"]`);
    await expect(card.getByRole("heading", { name: label, exact: true })).toBeVisible();
    await expect(card.locator(".prediction-zone-count")).toContainText("5 destacades");
    await expect(card.locator(".prediction-zone-count")).toContainText("perfils compatibles");
    const mapLink = card.getByRole("link", { name: /Veure la zona al mapa/ });
    const mapUrl = new URL((await mapLink.getAttribute("href"))!, "http://localhost");
    const speciesId = mapUrl.searchParams.get("species");

    expect(mapUrl.pathname).toBe("/map");
    expect(mapUrl.searchParams.get("region")).toBe(regionId);
    expect(speciesId).toBeTruthy();
    await expect(card.locator(`a[href="/bolets/${speciesId}"]`)).toHaveCount(1);
  }
});

test("the guides hub owns the curated local directory", async ({ page }) => {
  const response = await page.goto("/guies");
  expect(response?.status()).toBe(200);

  const guideList = page.locator("[data-local-guide-list]");
  await expect(guideList.locator(".location-place-card")).toHaveCount(5);
  await expect(page.locator(".guides-summary")).toContainText("5");
  await expect(page.locator(".guides-summary")).toContainText("10");
  await expect(page.locator(".guides-summary")).toContainText("30");
  await expect(page.getByRole("link", { name: /Veure les zones/ })).toHaveAttribute("href", "/zones");
  const speciesGuideList = page.locator("[data-species-guide-list]");
  await expect(speciesGuideList).toHaveCount(1);
  await expect(speciesGuideList.locator(".guides-species-module-label")).toHaveCount(1);
  const speciesGuideRows = speciesGuideList.locator(".guides-species-row");
  await expect(speciesGuideRows).toHaveCount(2);
  const rowBoxes = await speciesGuideRows.evaluateAll((rows) =>
    rows.map((row) => {
      const bounds = row.getBoundingClientRect();
      return { top: bounds.top, bottom: bounds.bottom };
    }),
  );
  expect(Math.abs(rowBoxes[1]!.top - rowBoxes[0]!.bottom)).toBeLessThanOrEqual(1);
  for (const [href, title] of [
    ["/zones/rovellons", "On trobar rovellons a Catalunya"],
    ["/zones/ceps", "On trobar ceps a Catalunya"],
  ] as const) {
    const feature = speciesGuideList.locator(`a.guides-species-row[href="${href}"]`);
    await expect(feature).toHaveCount(1);
    await expect(feature.getByRole("heading", { name: title })).toBeVisible();
    await expect(feature).toContainText("Obrir la guia");
  }

  for (const area of ["ripolles", "bergueda", "montseny", "cerdanya", "ports"]) {
    await expect(guideList.locator(`a[href="/zones/${area}"]`)).toHaveCount(1);
  }
});

test("the rovellons guide connects every published Lactarius local guide", async ({ page }) => {
  const response = await page.goto("/zones/rovellons");
  expect(response?.status()).toBe(200);

  const guides = page.locator("[data-rovello-local-guides]");
  await expect(guides.locator("a")).toHaveCount(8);
  for (const href of [
    "/zones/ripolles/camprodon/rovellons",
    "/zones/ripolles/camprodon/pinetells",
    "/zones/cerdanya/bellver-de-cerdanya/rovellons",
    "/zones/cerdanya/bellver-de-cerdanya/pinetells",
  ]) {
    await expect(guides.locator(`a[href="${href}"]`)).toHaveCount(1);
  }
});

test("the ceps guide connects every cep, broad region and published local guide", async ({ page }) => {
  const response = await page.goto("/zones/ceps");
  expect(response?.status()).toBe(200);

  const speciesList = page.locator("[data-cep-species-list]");
  const expectedSpecies = [
    "boletus-edulis",
    "boletus-pinophilus",
    "boletus-aereus",
    "boletus-reticulatus",
  ] as const;
  await expect(speciesList.locator(".species-card")).toHaveCount(4);
  for (const speciesId of expectedSpecies) {
    await expect(speciesList.locator(`a[href="/bolets/${speciesId}"]`)).toHaveCount(1);
  }

  const expectedReadings = [
    ["pirineus", "boletus-pinophilus"],
    ["prepirineus", "boletus-edulis"],
    ["emporda", "boletus-aereus"],
    ["catalunya-central", "boletus-reticulatus"],
    ["muntanyes-interiors", "boletus-pinophilus"],
    ["montseny", "boletus-edulis"],
    ["serralades-costeres", "boletus-aereus"],
    ["serralades-prelitorals", "boletus-reticulatus"],
    ["ports", "boletus-aereus"],
  ] as const;
  const regionList = page.locator("[data-cep-region-list]");
  await expect(regionList.locator(":scope > a")).toHaveCount(9);
  for (const [regionId, speciesId] of expectedReadings) {
    const link = regionList.locator(`a[data-region="${regionId}"]`);
    const href = new URL((await link.getAttribute("href"))!, "http://localhost");
    expect(href.pathname).toBe("/map");
    expect(href.searchParams.get("region")).toBe(regionId);
    expect(href.searchParams.get("species")).toBe(speciesId);
  }

  await expect(page.locator("[data-cep-local-guides] > a")).toHaveCount(10);
  await expect(page.locator(".rovellons-faq details")).toHaveCount(7);
  await expect(page.locator(".rovellons-safety")).toContainText("ACSA");
  await expect(page.locator(".editorial-panel")).toContainText(
    "Revisió editorial; revisió micològica independent pendent",
  );
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
