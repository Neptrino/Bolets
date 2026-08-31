import { expect, test } from "@playwright/test";
import {
  areaProfiles,
  placeProfiles,
  speciesLocationPages,
} from "@/data/location-pages";
import { cepSpeciesIds } from "@/src/lib/ceps-guide";
import { speciesSlugForId } from "@/data/species-slugs";
import { seasonGuideForMonth } from "@/src/lib/season-guides";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { getSpeciesMapPageBySlug, speciesMapPages } from "@/src/lib/species-map-pages";
import { speciesTerritoryGuides } from "@/src/lib/species-territory-guides";

function speciesIdFromMapUrl(url: URL) {
  return url.searchParams.get("species")
    ?? getSpeciesMapPageBySlug(url.pathname.split("/").at(-1) ?? "")?.speciesId
    ?? null;
}

test("permanently redirects legacy catalogue URLs and preserves query parameters", async ({ request }) => {
  const catalogue = await request.get("/species?region=pirineus", { maxRedirects: 0 });
  expect(catalogue.status()).toBe(308);
  expect(new URL(catalogue.headers().location!, "http://localhost").pathname).toBe("/bolets");
  expect(new URL(catalogue.headers().location!, "http://localhost").searchParams.get("region")).toBe("pirineus");

  const profile = await request.get("/species/boletus-edulis?region=pirineus", { maxRedirects: 0 });
  expect(profile.status()).toBe(308);
  const profileLocation = new URL(profile.headers().location!, "http://localhost");
  expect(profileLocation.pathname).toBe("/bolets/cep");
  expect(profileLocation.searchParams.get("region")).toBe("pirineus");

  const scientificProfile = await request.get("/bolets/boletus-edulis?region=pirineus", { maxRedirects: 0 });
  expect(scientificProfile.status()).toBe(308);
  const scientificProfileLocation = new URL(scientificProfile.headers().location!, "http://localhost");
  expect(scientificProfileLocation.pathname).toBe("/bolets/cep");
  expect(scientificProfileLocation.searchParams.get("region")).toBe("pirineus");

  const rovellons = await request.get("/rovellons?region=pirineus", { maxRedirects: 0 });
  expect(rovellons.status()).toBe(308);
  const rovellonsLocation = new URL(rovellons.headers().location!, "http://localhost");
  expect(rovellonsLocation.pathname).toBe("/zones/rovellons");
  expect(rovellonsLocation.searchParams.get("region")).toBe("pirineus");

  const speciesMap = await request.get("/map?species=boletus-edulis&region=pirineus", { maxRedirects: 0 });
  expect(speciesMap.status()).toBe(308);
  const speciesMapLocation = new URL(speciesMap.headers().location!, "http://localhost");
  expect(speciesMapLocation.pathname).toBe("/map/cep");
  expect(speciesMapLocation.searchParams.get("region")).toBe("pirineus");
});

for (const route of [
  "/bolets",
  "/bolets/cep",
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
  "/map/rovello",
  "/map/cep",
]) {
  test(`${route} has one H1, a self canonical and structured data`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await expect(page.locator('script[type="application/ld+json"]')).not.toHaveCount(0);
  });
}

test("the Rovellons and Ceps type tables scroll without widening mobile pages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of ["/zones/rovellons", "/zones/ceps"]) {
    await page.goto(route);
    await expect(page.locator(".guide-types-scroll-hint")).toBeVisible();
    const dimensions = await page.locator(".guide-types-table-scroll").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
    expect(dimensions.documentWidth).toBe(dimensions.viewportWidth);
  }
});

test("every month in the season calendar links to its own canonical page", async ({ page }) => {
  await page.goto("/temporada");

  const calendar = page.getByRole("navigation", { name: "Calendari anual de la temporada de bolets" });
  await expect(calendar.getByRole("link")).toHaveCount(12);
  await calendar.getByRole("link", { name: /Temporada de bolets al setembre/ }).click();

  await expect(page).toHaveURL(/\/temporada\/setembre$/);
  await expect(page.getByRole("link", { name: /Temporada de bolets al setembre/ })).toHaveAttribute("aria-current", "page");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/temporada\/setembre$/);
  await expect(page.getByRole("link", { name: "← Temporada de bolets a Catalunya" })).toHaveAttribute("href", "/temporada");
  await expect(page.getByRole("heading", { name: "Bolets al setembre." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Calendari de bolets al setembre" })).toBeVisible();
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.some((item) => item.includes('"BreadcrumbList"'))).toBe(true);
});

test("the catalogue separates monthly and seasonal navigation", async ({ page }) => {
  await page.goto("/bolets");

  const directory = page.locator(".directory-shell");
  const supportingLinks = page.locator(".species-catalogue-support");
  await expect(directory.locator(".directory-controls")).toBeInViewport();
  const shortcuts = directory.getByRole("navigation", { name: "Explora el catàleg" });
  await expect(shortcuts.getByRole("link")).toHaveCount(7);
  await expect(shortcuts.getByRole("group", { name: "Explora espècies" }).getByRole("link")).toHaveCount(3);
  await expect(shortcuts.getByRole("group", { name: "Per estacions" }).getByRole("link")).toHaveCount(4);
  await expect(shortcuts).toBeInViewport();
  await expect(shortcuts.getByRole("link", { name: "Comestibles" })).toHaveAttribute("href", "/bolets-comestibles");
  await expect(shortcuts.getByRole("link", { name: "Verinosos" })).toHaveAttribute("href", "/bolets-verinosos");
  await expect(shortcuts.getByRole("link", { name: "Per mesos" })).toHaveAttribute("href", "/temporada");
  await expect(shortcuts.getByRole("link", { name: "Primavera" })).toHaveAttribute("href", "/bolets-de-primavera");
  await expect(shortcuts.getByRole("link", { name: "Estiu" })).toHaveAttribute("href", "/bolets-d-estiu");
  await expect(shortcuts.getByRole("link", { name: "Tardor" })).toHaveAttribute("href", "/bolets-de-tardor");
  await expect(shortcuts.getByRole("link", { name: "Hivern" })).toHaveAttribute("href", "/bolets-d-hivern");
  const [directoryBox, supportingLinksBox] = await Promise.all([
    directory.boundingBox(),
    supportingLinks.boundingBox(),
  ]);
  expect(directoryBox).not.toBeNull();
  expect(supportingLinksBox).not.toBeNull();
  expect(directoryBox!.y).toBeLessThan(supportingLinksBox!.y);
  await expect(page.getByRole("navigation", { name: "Tipus i calendari de bolets" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Bolets per estació de l’any" })).toHaveCount(0);
  const tools = page.getByRole("navigation", { name: "Eines pràctiques del catàleg" });
  await expect(tools.getByRole("link")).toHaveCount(3);
  await expect(tools.getByRole("link", { name: /Mapa de bolets/ })).toHaveAttribute("href", "/map");
  await expect(tools.getByRole("link", { name: /On trobar bolets avui/ })).toHaveAttribute("href", "/bolets-avui");
  await expect(tools.getByRole("link", { name: /Conservar i congelar bolets/ })).toHaveAttribute("href", "/conservar-bolets");
});

test("the footer links to the current Catalonia season", async ({ page }) => {
  const currentGuide = seasonGuideForMonth(monthInTimeZone());
  await page.goto("/temporada");

  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Temporada de bolets", exact: true })).toHaveAttribute("href", "/temporada");
  await expect(footer.getByRole("link", { name: currentGuide.cardTitle })).toHaveAttribute("href", currentGuide.path);
});

test("the homepage delegates the full current-conditions query to its canonical overview", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const feature = page.locator('a.home-today-feature[href="/bolets-avui"]');
  await expect(feature.getByRole("heading", { name: "Condicions actuals per territori" })).toBeVisible();
  await expect(feature).toContainText("On trobar bolets avui");
  await expect(page.getByRole("heading", { name: "On trobar bolets avui i aquesta setmana?" })).toHaveCount(0);
  const heroGap = await page.evaluate(() => {
    const hero = document.querySelector(".hero")?.getBoundingClientRect();
    const currentConditions = document.querySelector(".home-today-feature")?.getBoundingClientRect();
    return hero && currentConditions ? currentConditions.top - hero.bottom : 0;
  });
  expect(heroGap).toBeGreaterThanOrEqual(15);
});

test("internal navigation exposes no legacy catalogue link", async ({ page }) => {
  for (const route of ["/", "/bolets", "/bolets/cep", "/map", "/compare/rovello-vs-pinetell"]) {
    await page.goto(route);
    await expect(page.locator('a[href^="/species"]'), route).toHaveCount(0);
  }
});

test("curated species maps expose canonical quick links without widening mobile pages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/map/rovello");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Mapa del rovelló a Catalunya: condicions avui/);
  await page.locator(".map-page-panel-toggle").click();
  const quickLinks = page.getByRole("navigation", { name: "Mapes ràpids per espècie" });
  await expect(quickLinks.getByRole("link")).toHaveCount(speciesMapPages.length);
  await expect(quickLinks.getByRole("link", { name: "Rovelló", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(quickLinks.getByRole("link", { name: "Cep", exact: true })).toHaveAttribute("href", "/map/cep");

  const width = await page.locator("html").evaluate((element) => ({
    document: element.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.document).toBe(width.viewport);
});

test("the current overview stays usable without publishing invented scores", async ({ page }) => {
  const response = await page.goto("/bolets-avui");
  expect(response?.status()).toBe(200);
  const cards = page.locator(".current-overview-card");
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThan(0);
  await expect(page.locator("body")).not.toContainText(/Model ecologia-v/i);
  await expect(page.locator(".current-overview-method")).toContainText(
    "El resultat compara territoris",
  );
  await expect(page.locator("body")).not.toContainText("Oportunitat O");
  await expect(page.locator("body")).not.toContainText("Condicions F");
  await expect(page.locator("body")).not.toContainText("H / F");
  expect((await cards.allTextContents()).join(" ")).not.toContain("NaN");
  if (cardCount === 0) {
    await expect(page.locator(".current-board-empty")).toBeVisible();
  } else {
    for (const card of await cards.all()) {
      const publishedScore = card.locator(".current-score");
      const withheldScore = card.locator(".current-unavailable");
      expect(await publishedScore.count() + await withheldScore.count()).toBe(1);
      const speciesLink = card.locator(".current-row-species > a.current-row-species-link");
      const mapLink = card.locator(".current-row-map");
      await expect(speciesLink).toHaveCount(1);
      await expect(speciesLink).toHaveAttribute("href", /^\/bolets\/[a-z0-9-]+$/);
      await expect(mapLink).toHaveCount(1);
      await expect(mapLink).toContainText("Veure mapa");

      const speciesHref = await speciesLink.getAttribute("href");
      const mapHref = await mapLink.getAttribute("href");
      const mapUrl = new URL(mapHref!, "http://localhost");
      expect(speciesHref?.split("/").at(-1)).toBe(
        speciesSlugForId(speciesIdFromMapUrl(mapUrl)!),
      );
      expect(mapUrl.searchParams.get("region")).toBeTruthy();
    }

    const leader = page.locator(".current-leader:not(.current-leader-empty)");
    if (await leader.count()) {
      await expect(leader.locator(".current-leader-species-link")).toHaveAttribute("href", /^\/bolets\/[a-z0-9-]+$/);
      await expect(leader.locator(".current-leader-link")).toContainText("Veure al mapa");
    }
  }
});

test("the zones directory lists every prediction region with representative species", async ({ page }) => {
  const response = await page.goto("/zones");
  expect(response?.status()).toBe(200);

  const list = page.locator("[data-prediction-zone-list]");
  const cards = list.locator(":scope > li");
  await expect(cards).toHaveCount(9);
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
    const card = list.locator(`li[data-region="${regionId}"]`);
    await expect(card.locator(".region-map-link-name")).toHaveText(label);
    await expect(card.locator(".region-map-link-count")).toContainText(/\d+ espècies/);
    const mapLink = card.getByRole("link", { name: `Veure ${label} al mapa` });
    const mapUrl = new URL((await mapLink.getAttribute("href"))!, "http://localhost");
    const speciesId = speciesIdFromMapUrl(mapUrl);

    expect(mapUrl.pathname === "/map" || speciesMapPages.some((page) => mapUrl.pathname === `/map/${page.slug}`)).toBe(true);
    expect(mapUrl.searchParams.get("region")).toBe(regionId);
    expect(speciesId).toBeTruthy();
  }
});

test("the guides hub owns the curated local directory", async ({ page }) => {
  const response = await page.goto("/guies");
  expect(response?.status()).toBe(200);

  const guideList = page.locator("[data-local-guide-list]");
  await expect(guideList.locator(".guide-browser-card")).toHaveCount(
    Math.min(16, speciesLocationPages.length),
  );
  await expect(guideList.locator(".guide-browser-status")).toContainText(
    `${speciesLocationPages.length} guies locals`,
  );
  const summaryItems = page.locator(".guides-summary > div");
  await expect(summaryItems.nth(0).locator("dd")).toHaveText(String(areaProfiles.length));
  await expect(summaryItems.nth(1).locator("dd")).toHaveText(String(placeProfiles.length));
  await expect(summaryItems.nth(2).locator("dd")).toHaveText(String(speciesLocationPages.length));
  await expect(page.getByRole("link", { name: /Comparar zones/ })).toHaveAttribute("href", "/zones");
  const speciesGuideList = page.locator("[data-species-guide-list]");
  await expect(speciesGuideList).toHaveCount(1);
  await expect(speciesGuideList.locator(".guides-species-module-label")).toHaveCount(1);
  const speciesGuideRows = speciesGuideList.locator(".guides-species-row");
  await expect(speciesGuideRows).toHaveCount(speciesTerritoryGuides.length);
  const rowBoxes = await speciesGuideRows.evaluateAll((rows) =>
    rows.map((row) => {
      const bounds = row.getBoundingClientRect();
      return { top: bounds.top, bottom: bounds.bottom };
    }),
  );
  expect(Math.abs(rowBoxes[1]!.top - rowBoxes[0]!.bottom)).toBeLessThanOrEqual(1);
  for (const [href, title] of [
    ["/zones/rovellons", "Rovellons a Catalunya: tipus, hàbitat i temporada"],
    ["/zones/ceps", "Ceps de Catalunya: tipus, diferències i temporada"],
  ] as const) {
    const feature = speciesGuideList.locator(`a.guides-species-row[href="${href}"]`);
    await expect(feature).toHaveCount(1);
    await expect(feature.getByRole("heading", { name: title })).toBeVisible();
    await expect(feature).toContainText("Obrir la guia");
  }
});

test("the rovellons guide connects every published Lactarius local guide", async ({ page }) => {
  const response = await page.goto("/zones/rovellons");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Rovellons a Catalunya: tipus, temporada i zones/);
  await expect(page.locator("h1")).toContainText("Rovellons");

  const types = page.locator("[data-rovellons-types-table]");
  await expect(types.locator("tbody tr")).toHaveCount(2);
  for (const speciesId of ["lactarius-sanguifluus", "lactarius-deliciosus"]) {
    await expect(types.locator(`a[href="/bolets/${speciesSlugForId(speciesId)}"]`)).toHaveCount(1);
  }
  await expect(page.getByRole("link", { name: /comparació entre rovelló i pinetell/i })).toHaveAttribute("href", "/compare/rovello-vs-pinetell");
  await expect(page.locator(".editorial-panel--compact")).toContainText("Editorial, no micològica");

  const guides = page.locator("[data-rovello-local-guides]");
  const lactariusGuideCount = speciesLocationPages.filter((guide) =>
    ["lactarius-sanguifluus", "lactarius-deliciosus"].includes(guide.speciesId),
  ).length;
  await expect(guides.locator("a")).toHaveCount(lactariusGuideCount);
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
  await expect(page).toHaveTitle(/Ceps de Catalunya: tipus, temporada i zones/);
  await expect(page.locator("h1")).toContainText("Ceps");

  const speciesList = page.locator("[data-cep-species-list]");
  const types = page.locator("[data-ceps-types-table]");
  const expectedSpecies = [
    "boletus-edulis",
    "boletus-pinophilus",
    "boletus-aereus",
    "boletus-reticulatus",
  ] as const;
  await expect(speciesList.locator(".species-card")).toHaveCount(4);
  await expect(types.locator("tbody tr")).toHaveCount(4);
  for (const speciesId of expectedSpecies) {
    const speciesSlug = speciesSlugForId(speciesId);
    await expect(speciesList.locator(`a[href="/bolets/${speciesSlug}"]`)).toHaveCount(1);
    await expect(types.locator(`a[href="/bolets/${speciesSlug}"]`)).toHaveCount(1);
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
    expect(href.pathname === "/map" || speciesMapPages.some((mapPage) => href.pathname === `/map/${mapPage.slug}`)).toBe(true);
    expect(href.searchParams.get("region")).toBe(regionId);
    expect(speciesIdFromMapUrl(href)).toBe(speciesId);
  }

  const cepGuideCount = speciesLocationPages.filter((guide) =>
    cepSpeciesIds.some((speciesId) => speciesId === guide.speciesId),
  ).length;
  await expect(page.locator("[data-cep-local-guides] > a")).toHaveCount(cepGuideCount);
  await expect(page.locator(".rovellons-faq details")).toHaveCount(7);
  await expect(page.locator(".rovellons-safety")).toContainText("ACSA");
  await expect(page.locator(".editorial-panel--compact")).toContainText("Editorial, no micològica");
});

test("safety-sensitive pages show editorial status and official escalation", async ({ page }) => {
  await page.goto("/bolets-verinosos");
  await expect(page.getByText("Editorial, no micològica")).toBeVisible();
  await expect(page.getByRole("link", { name: /guia de l’ACSA/i })).toHaveAttribute("href", /acsa\.gencat\.cat/);
  await expect(page.getByText(/061 Salut Respon/).first()).toBeVisible();

  await page.goto("/bolets/farinera-borda");
  await expect(page.locator(".species-official-safety")).toContainText("061 Salut Respon");
  await expect(page.locator(".editorial-panel--compact")).toContainText("Editorial, no micològica");
});
