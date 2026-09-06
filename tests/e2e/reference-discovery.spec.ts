import { expect, test } from "@playwright/test";

test.describe("reference without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  test("searches from home and answers a naming question without an account", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero").getByRole("link", { name: "Explora les espècies" })).toBeVisible();
    await expect(page.locator(".hero").getByRole("link", { name: "Mapa de bolets" })).toBeVisible();
    const search = page.getByRole("search", { name: "Cerca un bolet" });
    await search.getByRole("textbox").fill("pinetell bord");
    await search.getByRole("button", { name: "Cerca al catàleg" }).click();
    // This regional name belongs to both profiles; readers must see the ambiguity.
    await expect(page.locator(".directory-shell .species-card")).toHaveCount(2);
    await page.getByRole("link", { name: "Obre la fitxa de Pinetell bord", exact: true }).click();
    await expect(page.locator("h1")).toHaveText("Pinetell bord");
    await page.getByRole("navigation", { name: "Contingut de la fitxa" }).getByRole("link", { name: "Noms", exact: true }).click();
    await expect(page.locator("#noms")).toBeInViewport();
    await expect(page.locator("#noms")).toContainText("Lactarius chrysorrheus");
    await expect(page.locator('.species-page a[href^="/map"]')).toHaveCount(0);
  });

  test("submits and clears catalogue queries through ordinary links and forms", async ({ page }) => {
    await page.goto("/bolets?q=zzzzzz");
    await expect(page.locator(".empty-state")).toBeVisible();
    await page.getByRole("link", { name: "Veure tot el catàleg", exact: true }).click();
    await page.getByRole("textbox", { name: "Cerca espècies" }).fill("cigro");
    await page.getByRole("button", { name: "Cerca", exact: true }).click();
    await expect(page.locator(".directory-shell .species-card")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Obre la fitxa de Cigró", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Neteja la cerca", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Cerca espècies" })).toHaveValue("");
    await expect(page.locator(".directory-shell .species-card")).not.toHaveCount(1);
  });
});

for (const width of [360, 390, 1280]) {
  test(`connects reference sections on ${width}px screens without prediction data`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const modelRequests: string[] = [];
    page.on("request", request => {
      if (/\/api\/(?:habitat|predictions|occurrences)(?:[/?]|$)/.test(request.url())) modelRequests.push(request.url());
    });
    await page.goto("/bolets/fals-rossinyol");
    const contents = page.getByRole("navigation", { name: "Contingut de la fitxa" });
    for (const [name, id] of [["Noms", "noms"], ["Espècies semblants", "confusions"], ["Hàbitat i temporada", "ecologia"], ["Fonts i autoria", "fonts"]]) {
      await contents.getByRole("link", { name, exact: true }).click();
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
    await expect(page.locator("#fonts")).toContainText("Editorial, no micològica");
    await page.locator("#fonts summary").click();
    await expect(page.locator("#fonts details")).toHaveAttribute("open", "");
    await expect(page.locator("#ecologia").getByRole("link", { name: "Calendari de bolets" })).toHaveAttribute("href", "/temporada");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    expect(modelRequests).toEqual([]);
  });
}

test("keeps the cep learning path connected when the habitat service is unavailable", async ({ page }) => {
  await page.route("**/api/habitat**", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"Unavailable in local test"}' }));
  await page.goto("/bolets/cep");
  await expect(page.locator("#identificació")).toContainText("Com reconèixer-lo");
  await expect(page.locator("#confusions a[href^='/bolets/']").first()).toBeVisible();
  await expect(page.locator("#ecologia").getByRole("link", { name: "Calendari de bolets" })).toBeVisible();
  await expect(page.locator("#cuina a[href^='/conservar-bolets']").first()).toBeVisible();
  await expect(page.locator("#fonts")).toContainText("Editorial, no micològica");
});
