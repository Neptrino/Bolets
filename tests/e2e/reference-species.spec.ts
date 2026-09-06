import { expect, test } from "@playwright/test";

const path = "/bolets/fals-rossinyol";

test("new reference species are searchable and have distinct profiles", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bolets");
  const search = page.getByRole("textbox", { name: "Cerca espècies" });
  await search.fill("pet de llop");
  await expect(page.locator(".directory-shell .species-card")).toHaveCount(3);
  for (const [term, name, slug] of [
    ["Lycoperdon perlatum", "Pet de llop perlat", "pet-de-llop-perlat"],
    ["bufa del diable", "Pet de llop gegant", "pet-de-llop-gegant"],
    ["Lycoperdon utriforme", "Pet de llop gros", "pet-de-llop-gros"],
    ["puagra llora", "Llora aspra", "llora-aspra"],
    ["Lactarius chrysorrheus", "Pinetell bord", "pinetell-bord"],
    ["Lactarius torminosus", "Rovelló de cabra", "rovello-de-cabra"],
    ["Ramaria formosa", "Peu de rata bord", "peu-de-rata-bord"],
    ["Lactifluus rugatus", "Lleterola roja", "lleterola-roja"],
    ["alzinenc", "Cigró", "cigro-alzinenc"],
  ]) {
    await search.fill(term);
    await expect(page.locator(".directory-shell .species-card")).toHaveCount(1);
    await page.getByRole("link", { name: `Obre la fitxa de ${name}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/bolets/${slug}$`));
    await expect(page.locator("h1")).toHaveText(name);
    await expect(page.locator("#cuina")).toBeVisible();
    await expect(page.locator("#ecologia")).toContainText("Perfil ecològic descriptiu");
    await expect(page.locator('.species-page a[href^="/map"]')).toHaveCount(0);
    const photo = page.locator(".species-gallery-stage img");
    await expect(photo).toHaveJSProperty("complete", true);
    await expect(photo).not.toHaveJSProperty("naturalWidth", 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.goto("/bolets");
  }
});

test("chanterelle details link to the false chanterelle guide", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bolets/rossinyol");
  const guide = page.locator(".lookalikes-subsection").getByRole("link", { name: "Guia del fals rossinyol", exact: true });
  await expect(guide).toHaveAttribute("href", "/fals-rossinyol");
  await guide.click();
  await expect(page).toHaveURL(/\/fals-rossinyol$/);
  await expect(page.getByRole("link", { name: "Obre la fitxa de Fals rossinyol", exact: true })).toHaveAttribute("href", path);
});

for (const width of [1280, 800, 390]) {
  test(`false chanterelle profile works at ${width}px without requesting map data`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const pageErrors: string[] = [];
    const modelRequests: string[] = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("request", request => {
      if (/\/api\/(?:habitat|predictions|occurrences)(?:[/?]|$)/.test(request.url())) modelRequests.push(request.url());
    });
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.locator("h1")).toHaveText("Fals rossinyol");
    await expect(page.locator(".species-hero .culinary-rating")).toHaveAccessibleName("Advertiment de consum: No recomanat");
    await expect(page.locator(".species-hero-facts")).toContainText("Barret de 4–8 cm");
    await expect(page.locator(".species-hero-facts")).toContainText("Tardor");
    await expect(page.locator(".species-hero-facts")).not.toContainText("Altitud");
    await expect(page.locator('.species-page a[href^="/map"]')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const photo = page.locator(".species-gallery-stage img");
    await expect(photo).toHaveJSProperty("complete", true);
    await expect(photo).not.toHaveJSProperty("naturalWidth", 0);
    await expect(photo).toHaveAttribute("src", /\/media\/optimized\/v\d+\/wikimedia\/hygrophoropsis-aurantiaca\.w/);
    await expect(page.locator(".species-gallery-thumbnails button")).toHaveCount(2);
    await page.getByRole("button", { name: "Fotografia següent", exact: true }).click();
    await expect(photo).toHaveAttribute("src", /hygrophoropsis-aurantiaca-soca/);
    await expect(photo).not.toHaveJSProperty("naturalWidth", 0);
    await expect(page.locator(".species-gallery-caption")).toContainText("Anneli Salo");
    await page.getByRole("button", { name: "Mostra la fotografia a mida gran", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    for (const id of ["identificació", "cuina", "ecologia", "targeta-de-camp"]) {
      await page.locator(`.species-aside a[href="#${id}"]`).click();
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
    await expect(page.locator(".editorial-panel--compact")).toContainText("Editorial, no micològica");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://bolets.app${path}`);
    expect(modelRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}

test("the catalogue finds false chanterelle by scientific and alternative names", async ({ page }) => {
  await page.goto("/bolets");
  const search = page.getByRole("textbox", { name: "Cerca espècies" });
  for (const term of ["Hygrophoropsis aurantiaca", "pixacà taronja"]) {
    await search.fill(term);
    await expect(page.locator(".directory-shell .species-card")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Obre la fitxa de Fals rossinyol", exact: true })).toBeVisible();
  }
  await page.getByRole("link", { name: "Obre la fitxa de Fals rossinyol", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.locator("h1")).toHaveText("Fals rossinyol");
});

test("rovelló and rovelló de cabra have a dedicated comparison guide", async ({ page }) => {
  await page.goto("/compare/rovello-vs-rovello-de-cabra");
  await expect(page.locator("h1")).toContainText("Rovelló");
  await expect(page.locator("h1")).toContainText("rovelló de cabra");
  await expect(page.locator(".comparison-answer")).toContainText("làtex vermell vinós");
  await expect(page.getByRole("link", { name: /Guia principal: Rovelló de cabra/ })).toHaveAttribute("href", "/bolets/rovello-de-cabra");
  await expect(page.getByRole("link", { name: "Obrir el comparador complet" })).toHaveCount(0);
});
