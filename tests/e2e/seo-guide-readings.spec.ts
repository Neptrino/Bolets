import { expect, test } from "@playwright/test";

test.use({ extraHTTPHeaders: { DNT: "1" } });

test("the ceps guide opens a local reading with its species and territory preserved", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/zones/ceps");
  await page.getByRole("link", { name: "Ceps al Port del Comte", exact: true }).click();
  await expect(page).toHaveURL(/\/zones\/solsones\/port-del-comte\/ceps$/);
  await expect(page.locator(".local-species-hero")).toContainText("Port del Comte");
  const actions = page.getByRole("navigation", { name: "Prepara la sortida" });
  await actions.getByRole("link", { name: "Consulta la lectura local" }).click();
  await expect(page.locator("#local-current")).toBeInViewport();
  const mapLink = actions.getByRole("link", { name: /Mapa de cep al Port del Comte/ });
  const target = new URL((await mapLink.getAttribute("href"))!, "http://localhost");
  expect(target.pathname).toBe("/map/cep");
  expect(target.searchParams.get("region")).toBe("prepirineus");
  for (const edge of ["west", "south", "east", "north"]) {
    expect(target.searchParams.has(edge)).toBe(true);
    expect(Number.isFinite(Number(target.searchParams.get(edge)))).toBe(true);
  }
});

test("all four winning local introductions are visible and have usable mobile actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, introduction] of [
    ["/zones/solsones/port-del-comte/ceps", "Port del Comte"],
    ["/zones/bergueda/rasos-de-peguera/ceps", "Les cotes i els boscos dels Rasos de Peguera"],
    ["/zones/ripolles/setcases/ceps-de-pi", "Setcases està envoltat de pinedes"],
    ["/zones/cerdanya/bellver-de-cerdanya/ceps-de-pi", "Els vessants forestals de Bellver de Cerdanya"],
  ]) {
    await page.goto(route!);
    await expect(page.locator(".local-species-hero")).toContainText(introduction!);
    await expect(page.getByRole("navigation", { name: "Prepara la sortida" }).getByRole("link")).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("Prades compares its documented species and connects to current conditions", async ({ page }) => {
  await page.goto("/zones/prades/prades");
  const comparison = page.locator("#local-species-comparison");
  await expect(comparison.getByRole("row")).toHaveCount(4);
  await expect(comparison).toContainText("Carlet");
  await expect(page.getByRole("navigation", { name: "Prepara la sortida" }).getByRole("link", { name: /condicions d’avui/ })).toHaveAttribute("href", "/bolets-avui");
  await comparison.getByRole("link", { name: "Carlet a Prades" }).click();
  await expect(page).toHaveURL(/\/zones\/prades\/prades\/carlets$/);
});

test("today's map follows the short answer and precedes the detailed ranking", async ({ page }) => {
  await page.goto("/bolets-avui");
  await expect(page.locator(".current-search-answer")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator(".current-reading-notes")).toContainText("no són una previsió dels pròxims set dies");
  expect(await page.locator(".current-map-overview").evaluate((element) => Boolean(
    element.compareDocumentPosition(document.querySelector(".current-board")!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ))).toBe(true);
  await expect(page.locator(".current-search-answer + .current-map-overview")).toHaveCount(1);
  await expect(page.locator(".current-leader, .current-search-readings")).toHaveCount(0);
  await expect(page.locator(".current-reading-notes")).toHaveCount(1);
});

test("priority profiles expose habitat, season and contextual guides", async ({ page }) => {
  for (const slug of ["cep", "cep-rogenc", "cep-negre", "cep-d-estiu", "fredolic", "camagroc", "rovello", "pinetell"]) {
    await page.goto(`/bolets/${slug}`);
    const summary = page.locator(".species-search-summary");
    await expect(summary).toContainText("El pic habitual");
    await expect(summary.getByRole("link", { name: /condicions d’avui/ })).toHaveAttribute("href", "/bolets-avui");
    expect(await summary.locator('a[href^="/zones/"]').count()).toBeGreaterThan(0);
    if (["rovello", "pinetell"].includes(slug)) {
      await expect(summary.locator('a[href="/zones/rovellons"]')).toBeVisible();
      await expect(summary.locator('a[href="/compare/rovello-vs-pinetell"]')).toBeVisible();
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://bolets.app/bolets/${slug}`);
  }
});

test("camagroc's photo explanation follows the selected photograph and enlarged view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bolets/camagroc");
  await expect(page.locator(".species-photo-reading")).toContainText("Barrets bruns i peus grocs");
  await page.getByRole("button", { name: /Mostra la fotografia 3 de/ }).click();
  await expect(page.locator(".species-photo-reading")).toContainText("Cara inferior del barret");
  await page.getByRole("button", { name: "Mostra la fotografia a mida gran" }).click();
  await expect(page.getByRole("dialog")).toContainText("Cara inferior del barret");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("poisonous comparisons show paired reference photos, credits and working comparison links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bolets-verinosos");
  await expect(page.locator(".poisonous-comparison-grid article")).toHaveCount(6);
  await expect(page.locator(".poisonous-photo-pair figure")).toHaveCount(12);
  expect(await page.locator(".poisonous-photo-pair figcaption a").count()).toBeGreaterThan(0);
  await page.getByRole("heading", { name: "Fredolic vs. fredolic metzinós" }).getByRole("link").click();
  await expect(page).toHaveURL(/\/compare\/fredolic-vs-fredolic-metzinos$/);
  await expect(page.locator("h1")).toContainText("Fredolic");
});
