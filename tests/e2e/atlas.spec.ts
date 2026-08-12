import { expect, test } from "@playwright/test";

test("explores the species atlas and comparison tools", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /El bosc parla/i }),
  ).toBeVisible();
  await expect(page.locator('header a[href="/map"]')).toHaveCount(1);
  await expect(page.locator('header a[href="/map"]')).toHaveText(
    "Mapa de predicció",
  );

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
  await expect(page.getByText(/mapa de compatibilitat ecològica/i)).toBeVisible();
  await expect(page.getByText("FungaCAT/GBIF · generalitzat a 10 km")).toBeVisible();
  await expect(
    page.getByText("Ratllat lila · registres històrics"),
  ).toBeVisible();
  await expect(page.getByText("Blau · zones compatibles")).toBeVisible();
  await expect(
    page.getByText("Coberta del sòl, altitud i pH compatibles", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Hàbitat potencial", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/no amplia les zones compatibles/i)).toBeVisible();
  await expect(page.getByText(/no indica presència actual/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Veure el mapa a pantalla completa" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Capes del mapa" }),
  ).toBeVisible();
  const compatibilityCanvas = page.locator(
    ".region-map-habitat .region-map-cells",
  );
  const historyCanvas = page.locator(".region-map-history");
  const compatibilityOpacity = page.getByLabel(
    "Opacitat de les zones compatibles",
  );
  const historyOpacity = page.getByLabel(
    "Opacitat dels registres històrics",
  );
  await compatibilityOpacity.fill("40");
  await historyOpacity.fill("30");
  await expect(compatibilityCanvas).toHaveCSS("opacity", "0.4");
  await expect(historyCanvas).toHaveCSS("opacity", "0.3");
  await page
    .getByRole("button", { name: "Amaga els registres històrics" })
    .click();
  await expect(historyCanvas).toHaveCSS("opacity", "0");
  await expect(compatibilityCanvas).toHaveCSS("opacity", "0.4");
  await page
    .getByRole("button", { name: "Mostra els registres històrics" })
    .click();
  await expect(historyCanvas).toHaveCSS("opacity", "0.3");
  const habitatLegendGap = await page
    .locator(".region-map-habitat")
    .evaluate((root) => {
      const viewport = root.querySelector(".region-map-viewport");
      const legend = root.querySelector(".habitat-map-legend");
      if (!viewport || !legend) return null;
      return (
        legend.getBoundingClientRect().top -
        viewport.getBoundingClientRect().bottom
      );
    });
  expect(habitatLegendGap).not.toBeNull();
  expect(habitatLegendGap!).toBeGreaterThanOrEqual(-1);
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
  await expect(page.getByLabel("Espècie seleccionada")).toHaveCount(1);
  await expect(page.locator(".species-switch-links")).toHaveCount(0);
  await expect(page.getByLabel("Àrea de Catalunya seleccionada")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: /Mapa topogràfic interactiu/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Apropar" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Veure el mapa a pantalla completa" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Veure el mapa a pantalla completa" })
    .click();
  await expect(
    page.getByRole("button", { name: "Sortir de pantalla completa" }),
  ).toBeVisible();
  const fullscreenMapBox = await page.locator(".map-stage").boundingBox();
  expect(fullscreenMapBox?.width).toBeGreaterThanOrEqual(1279);
  expect(fullscreenMapBox?.height).toBeGreaterThanOrEqual(719);
  const fullscreenSpeciesSelect = page.getByLabel(
    "Canvia l’espècie del mapa en pantalla completa",
  );
  await expect(fullscreenSpeciesSelect).toBeVisible();
  await fullscreenSpeciesSelect.click();
  await page.getByRole("option", { name: "Cep rogenc", exact: true }).click();
  await expect(page).toHaveURL(/species=boletus-pinophilus/);
  await expect(
    page.getByRole("button", { name: "Sortir de pantalla completa" }),
  ).toBeVisible();
  await expect(fullscreenSpeciesSelect).toContainText("Cep rogenc");
  await page
    .getByRole("button", { name: "Sortir de pantalla completa" })
    .click();
  await expect(
    page.getByRole("button", { name: "Veure el mapa a pantalla completa" }),
  ).toBeVisible();
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
  const cellCanvas = page.locator(".full-map .region-map-cells");
  const cellOpacity = page.getByLabel("Opacitat de les cel·les");
  await expect(cellOpacity).toHaveValue("100");
  await cellOpacity.fill("40");
  await expect(cellCanvas).toHaveCSS("opacity", "0.4");
  await page
    .getByRole("button", { name: "Amaga les cel·les del mapa" })
    .click();
  await expect(cellCanvas).toHaveCSS("opacity", "0");
  await expect(cellOpacity).toBeDisabled();
  await page
    .getByRole("button", { name: "Mostra les cel·les del mapa" })
    .click();
  await expect(cellCanvas).toHaveCSS("opacity", "0.4");
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

test("starts the habitat map near the current location", async ({
  context,
  page,
}) => {
  const currentLocation = { longitude: 2.15, latitude: 41.39 };
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(currentLocation);
  const habitatRequest = page.waitForRequest("**/api/habitat?*");
  await page.route("**/api/habitat?*", (route) =>
    route.fulfill({
      json: {
        cells: [],
        truncated: false,
        occurrenceEvidence: { available: true, cells: [] },
      },
    }),
  );

  await page.goto("/species/boletus-edulis?region=pirineus");

  const requestUrl = new URL((await habitatRequest).url());
  const west = Number(requestUrl.searchParams.get("west"));
  const south = Number(requestUrl.searchParams.get("south"));
  const east = Number(requestUrl.searchParams.get("east"));
  const north = Number(requestUrl.searchParams.get("north"));
  expect(west).toBeLessThan(currentLocation.longitude);
  expect(east).toBeGreaterThan(currentLocation.longitude);
  expect(south).toBeLessThan(currentLocation.latitude);
  expect(north).toBeGreaterThan(currentLocation.latitude);
  expect(east - west).toBeLessThan(1);
  expect(north - south).toBeLessThan(1);
  expect(requestUrl.searchParams.get("resolution")).toBe("2500");
});

test("keeps ecologically excluded cells clickable after changing species", async ({
  page,
}) => {
  const cellBounds = [[-0.5, 40.1], [3.9, 43.2]];

  await page.route("**/api/predictions?*", async (route) => {
    const url = new URL(route.request().url());
    const speciesId = url.searchParams.get("species") ?? "boletus-edulis";
    const excluded = speciesId === "lactarius-deliciosus";
    const mapCell = {
      speciesId,
      cellId: "excluded-test-cell",
      regionId: "pirineus",
      gridSizeM: 250,
      cellBounds,
      score: excluded ? 0 : 60,
      label: excluded ? "poc favorable" : "mixta",
    };

    if (url.searchParams.has("cell")) {
      await route.fulfill({
        json: {
          cell: {
            ...mapCell,
            observedAt: "2026-10-15T12:00:00.000Z",
            sourceResolutionM: 250,
            confidence: "high",
            stale: false,
            source: ["test"],
            unavailableFields: [],
            values: {
              altitudeM: excluded ? 2200 : 1200,
              forestCompatibility: 100,
              soilCompatibility: 100,
              rainfall7dMm: 25,
              soilMoistureAvg24h: 0.3,
              temperatureAvg24hC: 14,
              relativeHumidityAvg24h: 80,
            },
            modelVersion: "test",
            factors: [],
            occurrenceEvidence: null,
            occurrenceEvidenceStatus: "no-records",
          },
        },
      });
      return;
    }

    await route.fulfill({ json: { cells: [mapCell], truncated: false } });
  });

  await page.goto("/map?species=boletus-edulis&region=pirineus");
  await expect(page.locator(".map-data-state")).toContainText("compatibles");

  await page.getByLabel("Espècie seleccionada").click();
  await page.getByRole("option", { name: "Rovelló", exact: true }).click();
  await expect(page).toHaveURL(/species=lactarius-deliciosus/);
  await expect(page.locator(".map-data-state")).toContainText(
    "Cap cel·la compatible",
  );

  const mapCanvas = page.locator(".full-map .maplibregl-canvas");
  await mapCanvas.hover();
  await expect(mapCanvas).toHaveCSS("cursor", "pointer");
  await mapCanvas.click();
  await expect(page.locator(".map-floating-card strong")).toHaveText("0/100");
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

test("keeps the user's location when changing species", async ({
  browser,
}) => {
  const context = await browser.newContext({
    geolocation: { longitude: 2.1734, latitude: 41.3851 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto("/map?species=boletus-edulis");
  const map = page.getByRole("region", { name: /Mapa topogràfic interactiu/ });
  const locationDot = page.locator(".maplibregl-user-location-dot");
  const distanceFromMapCentre = async () => {
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
  };

  await expect(locationDot).toBeVisible({ timeout: 12_000 });
  await expect.poll(distanceFromMapCentre).toBeLessThan(80);

  await page.getByLabel("Espècie seleccionada").click();
  await page.getByRole("option", { name: "Rovelló", exact: true }).click();
  await expect(page).toHaveURL(/species=lactarius-deliciosus/);
  await expect(locationDot).toBeVisible();
  await expect.poll(distanceFromMapCentre).toBeLessThan(80);

  await context.close();
});
