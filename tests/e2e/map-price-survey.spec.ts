import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test.beforeEach(async ({ page }) => {
  let answer: string | null = null;
  await page.route("**/api/map-price-survey", (route) => {
    if (route.request().method() === "POST") answer ??= route.request().postDataJSON().answer;
    return route.fulfill({ json: { answer } });
  });
  await page.route("https://analytics.bolets.app/**", (route) => route.fulfill({ body: "" }));
  await page.route("**/api/me/contributor-access", (route) => route.fulfill({
    json: { authenticated: false, active: false, level: "public", minimumResolutionM: 2500 },
  }));
  await page.route("**/api/predictions?*", (route) => route.fulfill({ json: { cells: [], truncated: false } }));
});

for (const width of [1280, 390]) {
  test(`global banner and dedicated survey work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/map");
    const banner = page.getByRole("complementary", { name: "Enquesta sobre el mapa detallat" });
    await expect(banner).toBeVisible();
    await expect(banner).not.toContainText("€");
    await expect(banner).toContainText("previsió a 14 dies");
    await expect(page.locator(".raster-map-surface")).toBeVisible();
    await expect(page.locator(".map-detail-access details")).toHaveCount(0);
    await expect.poll(async () => (await page.locator(".map-stage").boundingBox())!.y +
      (await page.locator(".map-stage").boundingBox())!.height).toBeLessThanOrEqual(901);
    await page.screenshot({ path: test.info().outputPath(`banner-${width}.png`) });
    await banner.getByRole("link", { name: width <= 620 ? "Opina" : "Dona la teva opinió" }).click();
    await expect(page).toHaveURL(/\/enquesta-mapa$/);
    await expect(banner).toHaveCount(0);
    await expect(page.locator("h1")).toContainText("Més dies per triar.");
    await expect(page.getByRole("region", { name: "Bolets existeix per preparar millor cada sortida" })).toContainText("els servidors");
    await expect(page.getByRole("region", { name: "De 2,5 km a 250 m" })).toContainText("100 sectors");
    await expect(page.getByRole("region", { name: "Previsió ampliada a 14 dies" })).toContainText("Disponible al gràfic de cada sector amb accés al mapa detallat");
    await expect(page.getByRole("region", { name: "Cada col·laboració pot fer-lo més útil" })).toContainText("un cop cada 30 dies");
    await expect(page.getByRole("img", { name: /Gràfic de demostració/ })).toHaveAttribute("alt", /previsió a 14 dies/);
    await expect(page.getByRole("button", { name: "4,99 € / any", exact: true })).toBeInViewport();
    const screenshots = page.locator('main img[src*="/editorial/map-survey/"]');
    await expect(screenshots).toHaveCount(3);
    for (const image of await screenshots.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const survey = page.getByRole("region", { name: "Quant pagaries l’any?", exact: true });
    await expect(survey).toContainText("Sense compte ni cobrament");
    await expect(survey).toContainText("Sectors de 250 m");
    await expect(survey).toContainText("Previsió a 14 dies");
    await expect(survey.getByRole("button")).toHaveCount(5);
    await expect(survey.getByRole("button", { name: "2,99 € / any", exact: true })).toBeEnabled();
    await expect(survey.getByRole("button", { name: "9,99 € / any", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`survey-${width}.png`), fullPage: true });
    const yes = survey.getByRole("button", { name: "4,99 € / any", exact: true });
    await yes.focus();
    await page.keyboard.press("Enter");
    await expect(yes).toHaveAttribute("aria-pressed", "true");
    await expect(yes).toBeDisabled();
    await expect(survey.getByRole("status")).toContainText("Has triat: 4,99 € / any");
    await page.reload();
    await expect(yes).toBeDisabled();
    await page.getByRole("link", { name: "Explora el mapa públic", exact: true }).click();
    await expect(banner).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("banner snooze lasts one day and does not block a direct survey visit", async ({ page }) => {
  await page.goto("/");
  await page.clock.install();
  const banner = page.getByRole("complementary", { name: "Enquesta sobre el mapa detallat" });
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Amaga l’enquesta durant 1 dia" }).click();
  await page.goto("/map");
  await expect(banner).toHaveCount(0);
  await page.goto("/enquesta-mapa");
  await expect(page.getByRole("button", { name: "No m’interessa", exact: true })).toBeEnabled();
  await page.clock.fastForward(24 * 60 * 60 * 1_000 + 1);
  await page.goto("/map");
  await expect(banner).toBeVisible();
});

test("delayed survey prompt follows active public-site use and stays dismissed for the session", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Enquesta sobre el mapa detallat" })).toBeVisible();
  await page.clock.install();
  await page.locator("main").dispatchEvent("pointerdown");
  await page.clock.fastForward(25_000);
  expect(await page.locator("dialog[open]").count()).toBe(0);
  await page.clock.fastForward(5_000);

  const prompt = page.getByRole("dialog", { name: "T’ajudaria veure més detall?" });
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText("Mapa a 250 m");
  await expect(prompt).toContainText("Previsió a 14 dies");
  await expect(prompt).not.toContainText("4,99");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.clock.fastForward(250);
  await page.screenshot({ path: test.info().outputPath("delayed-prompt-mobile.png") });

  await prompt.getByRole("button", { name: "Ara no", exact: true }).click();
  await expect(prompt).toBeHidden();
  await expect(page.getByRole("complementary", { name: "Enquesta sobre el mapa detallat" })).toHaveCount(0);
  await page.locator("main").dispatchEvent("pointerdown");
  await page.clock.fastForward(30_000);
  await expect(prompt).toBeHidden();
});

test("a failed save shows an error and remains retryable until a confirmed receipt", async ({ page }) => {
  let attempts = 0;
  let answer: string | null = null;
  await page.unroute("**/api/map-price-survey");
  await page.route("**/api/map-price-survey", (route) => {
    if (route.request().method() === "POST") {
      attempts++;
      if (attempts === 1) return route.fulfill({ status: 503, json: { error: "No hem pogut confirmar la resposta. Torna-ho a provar." } });
      answer = route.request().postDataJSON().answer;
    }
    return route.fulfill({ json: { answer } });
  });
  await page.goto("/enquesta-mapa");
  const choice = page.getByRole("button", { name: "4,99 € / any", exact: true });
  await choice.click();
  await expect(page.getByRole("region", { name: "Quant pagaries l’any?", exact: true }).getByRole("alert")).toContainText("No hem pogut confirmar");
  await expect(choice).toBeEnabled();
  await expect(choice).toHaveAttribute("aria-pressed", "false");
  await choice.click();
  await expect(page.getByRole("status")).toContainText("Resposta desada");
  await expect(choice).toBeDisabled();
  expect(attempts).toBe(2);
});
