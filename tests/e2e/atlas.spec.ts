import { expect, test } from "@playwright/test";

test("explores the species atlas and comparison tools", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /El bosc parla/i }),
  ).toBeVisible();

  await page.goto("/species");
  await page
    .getByPlaceholder("Cerca per nom, gènere o família")
    .fill("rossinyol");
  await expect(page.getByRole("link", { name: /Rossinyol/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Cep rogenc/i })).toHaveCount(0);

  await page.goto("/species/boletus-edulis");
  await expect(
    page.getByRole("heading", { name: "Cep", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".section-kicker svg")).toHaveCount(9);
  await expect(page.getByText("Condicions ideals i mapa actual")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "On podria créixer a Catalunya" }),
  ).toBeVisible();
  await expect(page.getByText(/mapa permanent d’hàbitat/i)).toBeVisible();
  await expect(page.getByText("FungaCAT/GBIF · generalitzat a 10 km")).toBeVisible();
  await expect(
    page.getByText("Amb registres històrics propers"),
  ).toBeVisible();
  await expect(page.getByText(/no indica presència actual/i)).toBeVisible();
  const habitatViewportBox = await page.locator(".region-map-viewport").first().boundingBox();
  const habitatLegendBox = await page.locator(".habitat-map-legend").boundingBox();
  expect(habitatViewportBox).not.toBeNull();
  expect(habitatLegendBox).not.toBeNull();
  expect(habitatLegendBox!.y).toBeGreaterThanOrEqual(
    habitatViewportBox!.y + habitatViewportBox!.height - 1,
  );
  await expect(page.getByText(/No són mesures d’una estació/i)).toBeVisible();
  await expect(page.getByText("Humitat de l’aire")).toBeVisible();
  await expect(
    page.getByText(/Patró preferit de l’espècie:/i),
  ).toBeVisible();
  await expect(page.getByText(/gelada.*últims 7 dies/i)).toBeVisible();
  await expect(
    page.getByText("Mín · 24 h", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/no és una probabilitat de trobar bolets/i),
  ).toBeVisible();
  await expect(
    page.getByLabel("Escala d’idoneïtat de molt dolent a excel·lent"),
  ).toContainText("Molt dolentDolentRegularBoExcel·lent");
  const sectionSpacing = await page
    .locator(".content-section")
    .evaluateAll((sections) =>
      sections.map((section) => {
        const style = getComputedStyle(section);
        return parseFloat(style.paddingBottom) + parseFloat(style.marginBottom);
      }),
    );
  expect(Math.max(...sectionSpacing)).toBeLessThanOrEqual(72);
  await page.locator(".factor-chart .recharts-rectangle").first().hover();
  await expect(page.locator(".factor-tooltip")).toBeVisible();
  await expect(page.locator(".factor-tooltip strong")).toHaveText(
    /Molt dolent|Dolent|Regular|Bo|Excel·lent/,
  );
  await expect(page.locator(".factor-tooltip")).not.toContainText("/100");

  await page.goto("/compare?left=boletus-edulis&right=lactarius-deliciosus");
  await expect(
    page.getByRole("heading", { name: "Dos bolets, dos paisatges." }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /Boletus edulis/ })).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Lactarius deliciosus/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Intercanvia les espècies" }),
  ).toHaveAttribute(
    "href",
    "/compare?left=lactarius-deliciosus&right=boletus-edulis",
  );
  await expect(page.getByRole("region", { name: "Cara a cara" })).toBeVisible();
  const rightSpeciesSelect = page.getByLabel("Selecciona l’espècie dreta");
  await rightSpeciesSelect.click();
  const speciesPopup = page.locator(".species-select-popup-comparison");
  await expect(speciesPopup).toBeVisible();
  await expect
    .poll(async () => {
      const [triggerBox, popupBox] = await Promise.all([
        rightSpeciesSelect.boundingBox(),
        speciesPopup.boundingBox(),
      ]);
      return Math.abs((triggerBox?.width ?? 0) - (popupBox?.width ?? 0));
    })
    .toBeLessThan(2);
  const popupBox = await speciesPopup.boundingBox();
  expect(popupBox?.height ?? Infinity).toBeLessThanOrEqual(294);
  const listOverflow = await speciesPopup
    .locator(".species-select-list")
    .evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
  expect(listOverflow.scrollHeight).toBeGreaterThan(listOverflow.clientHeight);
  await page.getByRole("option", { name: "Rossinyol" }).click();
  await expect(page).toHaveURL(/right=cantharellus-cibarius/);

  await page.setViewportSize({ width: 390, height: 844 });
  const [leftMobileBox, rightMobileBox] = await Promise.all([
    page.getByLabel("Selecciona l’espècie esquerra").boundingBox(),
    page.getByLabel("Selecciona l’espècie dreta").boundingBox(),
  ]);
  expect(rightMobileBox?.y ?? 0).toBeGreaterThan(
    (leftMobileBox?.y ?? 0) + (leftMobileBox?.height ?? 0),
  );
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto("/map?species=boletus-edulis&region=pirineus");
  await expect(
    page.getByRole("heading", { name: "Mapa de compatibilitat" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: /Mapa topogràfic interactiu/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Apropar" })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Mostra la meva ubicació|Ubicació no disponible/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Veure tot Catalunya" }),
  ).toBeVisible();
  await expect(page.locator(".map-data-state")).toContainText(
    /cel·les|Apropa el mapa|No s’han pogut carregar/,
  );
  await expect(
    page.getByText("Una cel·la mai representa una observació de bolets"),
  ).toBeVisible();

  const mapCanvas = page.locator(".full-map .maplibregl-canvas");
  await mapCanvas.evaluate((element) => {
    element.setAttribute("data-viewport-instance", "preserved");
  });
  await page.getByLabel("Espècie seleccionada").click();
  await page.getByRole("option", { name: "Rovelló", exact: true }).click();
  await expect(page).toHaveURL(/species=lactarius-deliciosus/);
  await expect(page.locator(".full-map .maplibregl-canvas")).toHaveAttribute(
    "data-viewport-instance",
    "preserved",
  );
});

test("separates camasec habitat from current seasonality", async ({ page }) => {
  await page.goto("/species/marasmius-oreades");

  await expect(
    page.getByRole("heading", { name: "On podria créixer a Catalunya" }),
  ).toBeVisible();
  await expect(page.getByText("Fora de temporada", { exact: true })).toBeVisible();
  await expect(page.getByText(/no una predicció d’avui/i)).toBeVisible();
});

test("keeps rendered text at 12px or larger", async ({ page }) => {
  for (const route of ["/", "/species/boletus-edulis", "/compare", "/map"]) {
    await page.goto(route);
    const violations = await page.locator("body *").evaluateAll((elements) =>
      elements.flatMap((element) => {
        const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
        if (!Number.isFinite(fontSize) || fontSize >= 12) return [];
        return [
          {
            element: element.tagName.toLowerCase(),
            className: element.className,
            fontSize,
          },
        ];
      }),
    );

    expect(violations, route).toEqual([]);
  }
});

test("starts the prediction map at the user's location", async ({
  browser,
}) => {
  const context = await browser.newContext({
    geolocation: { longitude: 2.1734, latitude: 41.3851 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto("/map?species=boletus-edulis&region=pirineus");
  const map = page.getByRole("region", { name: /Mapa topogràfic interactiu/ });
  const locationDot = page.locator(".maplibregl-user-location-dot");
  await expect(locationDot).toBeVisible({ timeout: 12_000 });
  await expect
    .poll(async () => {
      const [mapBox, dotBox] = await Promise.all([
        map.boundingBox(),
        locationDot.boundingBox(),
      ]);
      if (!mapBox || !dotBox) return Infinity;
      const horizontalDistance = Math.abs(
        mapBox.x + mapBox.width / 2 - (dotBox.x + dotBox.width / 2),
      );
      const verticalDistance = Math.abs(
        mapBox.y + mapBox.height / 2 - (dotBox.y + dotBox.height / 2),
      );
      return Math.max(horizontalDistance, verticalDistance);
    })
    .toBeLessThan(80);

  await context.close();
});
