import { expect, test } from "@playwright/test";

const path = "/preguntes-frequents-bolets";

for (const viewport of [{ width: 1280, height: 900 }, { width: 800, height: 900 }, { width: 390, height: 844 }]) {
  test(`hunting FAQ fits and expands without overlaps at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText("Anar a buscar bolets");
    await expect(page.locator("main details")).toHaveCount(15);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://bolets.app${path}`);

    const first = page.locator("main details").first();
    await expect(first).toHaveAttribute("open", "");
    await first.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(first).not.toHaveAttribute("open");
    await page.keyboard.press("Space");
    await expect(first).toHaveAttribute("open", "");

    for (const topic of ["quan-anar-hi", "on-buscar", "identificacio", "recolleccio-responsable"]) {
      await page.locator(`nav a[href="#${topic}"]`).click();
      await expect(page.locator(`#${topic}`)).toBeInViewport();
    }
    for (const details of await page.locator("main details").all()) {
      if (await details.getAttribute("open") === null) await details.locator("summary").click();
      await expect(details.locator("p").first()).toBeVisible();
    }
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const boxes = await Promise.all((await page.locator("main details").all()).map((item) => item.boundingBox()));
    for (let i = 1; i < boxes.length; i++) expect(boxes[i]!.y).toBeGreaterThanOrEqual(boxes[i - 1]!.y + boxes[i - 1]!.height - 1);
    await expect(page.locator(".editorial-panel")).toContainText("Editorial, no micològica");
  });
}

test("guides and footer lead to the FAQ, whose answers link to deeper guides", async ({ page }) => {
  await page.goto("/guies");
  await page.locator(`main a[href="${path}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await page.locator('main details a[href="/temporada"]').click();
  await expect(page).toHaveURL(/\/temporada$/);
  await page.locator(`footer a[href="${path}"]`).click();
  await page.getByText("Cal un permís per collir bolets? S’ha de pagar?", { exact: true }).click();
  await page.locator('main details a[href="/normativa-bolets#collecting-cost"]').click();
  await expect(page).toHaveURL(/\/normativa-bolets#collecting-cost$/);
  await expect(page.locator("#collecting-cost")).toBeInViewport();
});

test("questions, answers and internal links work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto(path);
  await expect(page.locator("main details")).toHaveCount(15);
  await page.getByText("Rovelló i pinetell són el mateix bolet?", { exact: true }).click();
  const comparison = page.locator('main details a[href="/compare/rovello-vs-pinetell"]');
  await expect(comparison).toBeVisible();
  await comparison.click();
  await expect(page).toHaveURL(/\/compare\/rovello-vs-pinetell$/);
  await expect(page.locator("h1")).toBeVisible();
  await context.close();
});

for (const javaScriptEnabled of [true, false]) {
  test(`every shared answer opens on direct navigation with JavaScript ${javaScriptEnabled ? "enabled" : "disabled"}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled, baseURL, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && /hydrat/i.test(message.text())) hydrationErrors.push(message.text());
    });
    await page.goto(path);
    const fragments = await page.locator('main details a[href^="#"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
    expect(fragments).toHaveLength(15);
    for (const fragment of fragments) {
      // Leave the document so this also tests initial fragment navigation,
      // not only changing the hash on an already hydrated FAQ.
      await page.goto("about:blank");
      await page.goto(`${path}${fragment}`);
      const answer = page.locator(fragment);
      await expect(answer.locator("..")).toHaveAttribute("open", "");
      await expect(answer.locator("p")).toBeInViewport();
    }
    // Reload/history restoration is progressively enhanced; first-arrival
    // native fragments and manual accordions are the no-JavaScript fallback.
    if (javaScriptEnabled) {
      await page.reload();
      await expect(page.locator(fragments.at(-1)! + " p")).toBeInViewport();
    }
    expect(hydrationErrors).toEqual([]);
    await context.close();
  });
}

test("answer permalinks can be shared and reopened through browser history", async ({ page }) => {
  await page.goto(`${path}#intoxicacio`);
  const poisoning = page.locator("details:has(#intoxicacio)");
  await expect(poisoning).toHaveAttribute("open", "");
  await poisoning.locator('a[href="#intoxicacio"]').focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${path}#intoxicacio$`));
  await poisoning.locator("summary").click();
  await page.getByRole("heading", { name: "Com preparar una sortida a buscar bolets amb nens?", exact: true }).click();
  await page.locator('#amb-nens a[href="#amb-nens"]').click();
  await expect(page).toHaveURL(new RegExp(`${path}#amb-nens$`));
  await page.goBack();
  await expect(poisoning).toHaveAttribute("open", "");
  await expect(page.locator("#intoxicacio p")).toBeInViewport();
  await page.goForward();
  await expect(page.locator("#amb-nens p")).toBeInViewport();
});

test("unmatched fragments do not open unrelated questions or break navigation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const fragment of ["on-buscar", "not-a-question", "%E0%A4%A"]) {
    await page.goto("about:blank");
    await page.goto(`${path}#${fragment}`);
    await expect(page.locator("main details[open]")).toHaveCount(1);
  }
  await page.locator('nav a[href="#identificacio"]').click();
  await expect(page.locator("#identificacio")).toBeInViewport();
  expect(errors).toEqual([]);
});

for (const [source, topic] of [
  ["/temporada", "quan-anar-hi"],
  ["/temporada/setembre", "quan-anar-hi"],
  ["/bolets-avui", "on-buscar"],
  ["/normativa-bolets", "recolleccio-responsable"],
]) {
  test(`${source} links to its relevant FAQ section`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(source, { waitUntil: "commit" });
    const link = page.locator(`main a[href="${path}#${topic}"]`);
    await expect(link).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path}#${topic}$`));
    await expect(page.locator(`#${topic}`)).toBeInViewport();
  });
}
