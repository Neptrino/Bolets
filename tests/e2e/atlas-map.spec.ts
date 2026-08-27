import { expect, test } from "@playwright/test";

test("shows every featured seasonal species on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const featuredCards = page.locator(".featured-grid .species-card");
  await expect(featuredCards).toHaveCount(3);
  expect(await featuredCards.evaluateAll((cards) =>
    cards.every((card) => getComputedStyle(card).display !== "none"),
  )).toBe(true);
});

test("keeps the map reading guide balanced across modes and viewports", async ({
  page,
}) => {
  await page.route("**/api/predictions?*", (route) =>
    route.fulfill({ json: { cells: [], truncated: false } }),
  );
  await page.route("**/api/habitat?*", (route) =>
    route.fulfill({
      json: {
        cells: [],
        truncated: false,
        occurrenceEvidence: { available: true, cells: [] },
      },
    }),
  );

  const readGuideLayout = () =>
    page.locator(".map-reading-guide").evaluate((guide) => {
      const copy = guide.querySelector(".map-reading-copy");
      if (!copy) throw new Error("Map reading copy is missing");
      const rectangles = Array.from(copy.children).map((paragraph) => {
        const bounds = paragraph.getBoundingClientRect();
        return { left: bounds.left, top: bounds.top, width: bounds.width };
      });
      return {
        guideWidth: guide.getBoundingClientRect().width,
        rectangles,
        overflows: guide.scrollWidth > guide.clientWidth,
      };
    });

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto(
    "/map?species=amanita-caesarea&region=prelitoral&mode=prediction",
  );
  const desktopPrediction = await readGuideLayout();
  expect(desktopPrediction.rectangles).toHaveLength(4);
  expect(
    Math.max(...desktopPrediction.rectangles.map(({ top }) => top)) -
      Math.min(...desktopPrediction.rectangles.map(({ top }) => top)),
  ).toBeLessThan(1);
  expect(desktopPrediction.overflows).toBe(false);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobilePrediction = await readGuideLayout();
  expect(
    Math.max(...mobilePrediction.rectangles.map(({ left }) => left)) -
      Math.min(...mobilePrediction.rectangles.map(({ left }) => left)),
  ).toBeLessThan(1);
  expect(
    mobilePrediction.rectangles.every(
      ({ width }) => width > mobilePrediction.guideWidth * 0.75,
    ),
  ).toBe(true);
  expect(mobilePrediction.overflows).toBe(false);

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto(
    "/map?species=amanita-caesarea&region=prelitoral&mode=compatibility",
  );
  const desktopCompatibility = await readGuideLayout();
  expect(desktopCompatibility.rectangles).toHaveLength(2);
  expect(
    Math.max(...desktopCompatibility.rectangles.map(({ top }) => top)) -
      Math.min(...desktopCompatibility.rectangles.map(({ top }) => top)),
  ).toBeLessThan(1);
  expect(desktopCompatibility.overflows).toBe(false);
});

test("switches prediction and compatibility from the layer control", async ({
  page,
}) => {
  await page.route("**/api/predictions?*", (route) =>
    route.fulfill({ json: { cells: [], truncated: false } }),
  );
  await page.route("**/api/habitat?*", (route) =>
    route.fulfill({
      json: {
        cells: [],
        truncated: false,
        occurrenceEvidence: { available: true, cells: [] },
      },
    }),
  );

  await page.goto("/map?species=boletus-edulis&region=pirineus");
  const map = page.locator(".full-map");
  const mapCanvas = map.locator(".maplibregl-canvas");

  await expect(
    page.getByRole("heading", { name: "Mapa de condicions" }),
  ).toBeVisible();
  await expect(map).toHaveAttribute("data-map-mode", "prediction");
  await page
    .getByRole("button", { name: "Mostra els controls del mapa" })
    .click();

  const modeControl = map.getByRole("radiogroup", { name: "Vista" });
  await expect(modeControl).toBeVisible();
  await expect(
    modeControl.getByRole("radio", { name: "Predicció" }),
  ).toBeChecked();
  await mapCanvas.evaluate((element) => {
    element.setAttribute("data-mode-switch-instance", "preserved");
  });

  const habitatRequest = page.waitForRequest("**/api/habitat?*");
  await modeControl
    .getByRole("radio", { name: "Compatibilitat" })
    .check();
  await habitatRequest;

  await expect(page).toHaveURL(/mode=compatibility/);
  await expect(
    page.getByRole("heading", { name: "Mapa de compatibilitat" }),
  ).toBeVisible();
  await expect(map).toHaveAttribute("data-map-mode", "compatibility");
  await expect(map.locator(".region-map-history")).toBeVisible();
  await expect(page.getByLabel("Opacitat de les zones compatibles")).toBeVisible();
  await expect(page.getByText(/El blau identifica els sectors/)).toBeVisible();
  await expect(page.locator(".conditions-panel-expanded")).toHaveCount(0);
  await expect(mapCanvas).toHaveAttribute(
    "data-mode-switch-instance",
    "preserved",
  );

  const predictionRequest = page.waitForRequest("**/api/predictions?*");
  await map
    .getByRole("radiogroup", { name: "Vista" })
    .getByRole("radio", { name: "Predicció" })
    .check();
  await predictionRequest;

  await expect(page).not.toHaveURL(/mode=compatibility/);
  await expect(
    page.getByRole("heading", { name: "Mapa de condicions" }),
  ).toBeVisible();
  await expect(map).toHaveAttribute("data-map-mode", "prediction");
  await expect(map.locator(".region-map-history")).toHaveCount(0);
  await expect(page.getByLabel("Opacitat de la predicció")).toBeVisible();
  await expect(mapCanvas).toHaveAttribute(
    "data-mode-switch-instance",
    "preserved",
  );
});

test("reports score-zero and withheld map cells together", async ({ page }) => {
  const cellBounds = [[0.5, 41], [1.5, 42]];
  await page.route("**/api/predictions?*", (route) =>
    route.fulfill({
      json: {
        cells: [
          {
            cellId: "mixed-zero",
            gridSizeM: 10000,
            cellBounds,
            score: 0,
            habitatCoverage: 0,
          },
          {
            cellId: "mixed-withheld",
            gridSizeM: 10000,
            cellBounds,
            score: null,
            habitatCoverage: 0.5,
          },
        ],
        truncated: false,
      },
    }),
  );

  await page.goto("/map?species=boletus-edulis&region=pirineus");

  const status = page.locator(".map-data-state");
  await expect(status.locator("strong")).toHaveText("Resultats mixtos a la vista");
  await expect(status).toContainText("puntuació 0, en vermell: 1 cel·la");
  await expect(status).toContainText("sense puntuació, en gris: 1 cel·la");
});

test("keeps prediction out of the camasec species guide", async ({ page }) => {
  await page.goto("/bolets/marasmius-oreades");

  await expect(
    page.getByRole("heading", { name: "On podria créixer a Catalunya" }),
  ).toBeVisible();
  await expect(page.getByText("Fora de temporada", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Condicions actuals" }),
  ).toHaveCount(0);
  await expect(page.getByText(/no una predicció d’avui/i)).toBeVisible();
});

test("keeps the black truffle in habitat-only mode", async ({ page }) => {
  await page.route("**/api/habitat?**", async (route) => {
    await route.fulfill({
      json: {
        cells: [],
        truncated: false,
        modelVersion: "habitat-v1",
        occurrenceEvidence: { available: false, cells: [] },
      },
    });
  });

  await page.goto("/map?species=tuber-melanosporum");

  await expect(page.getByRole("heading", { name: "Mapa de compatibilitat" })).toBeVisible();
  await expect(page.getByText(/La tòfona negra és hipogea/)).toBeVisible();
  const map = page.locator(".full-map");
  await expect(map).toHaveAttribute("data-map-mode", "compatibility");
  await page.getByRole("button", { name: "Mostra els controls del mapa" }).click();
  const modeControl = map.getByRole("radiogroup", { name: "Vista" });
  await expect(modeControl.getByRole("radio", { name: "Compatibilitat" })).toBeChecked();
  await expect(modeControl.getByRole("radio", { name: "Predicció" })).toHaveCount(0);
  await expect(page.locator(".map-floating-card")).toHaveCount(0);
});

test("keeps model component labels readable on narrow maps", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/map?species=boletus-edulis&region=prepirineus");

  const mobileMapLayout = await page.evaluate(() => {
    const picker = document
      .querySelector('[aria-label="Espècie seleccionada"]')
      ?.getBoundingClientRect();
    const stage = document.querySelector(".map-stage")?.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      pickerHeight: picker?.height ?? 0,
      pickerWidth: picker?.width ?? 0,
      stageTop: stage?.top ?? Infinity,
      stageWidth: stage?.width ?? 0,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobileMapLayout.documentWidth).toBeLessThanOrEqual(
    mobileMapLayout.viewportWidth,
  );
  expect(mobileMapLayout.pickerHeight).toBeGreaterThanOrEqual(52);
  expect(mobileMapLayout.pickerWidth).toBeGreaterThanOrEqual(
    mobileMapLayout.viewportWidth - 60,
  );
  expect(mobileMapLayout.stageTop).toBeLessThan(430);
  expect(mobileMapLayout.stageWidth).toBeGreaterThanOrEqual(
    mobileMapLayout.viewportWidth - 20,
  );

  await expect(
    page.getByRole("button", { name: "Mostra els controls del mapa" }),
  ).toBeVisible();

  const chart = page.locator(".factor-chart");
  await expect(chart).toBeVisible();
  const componentList = chart.getByRole("list", { name: "Multiplicadors del càlcul" });
  await expect(componentList).toBeVisible();
  const componentLabels = componentList.locator(".factor-bar-label");
  const componentValues = componentList.locator(".factor-bar-reading strong");
  const componentHelp = componentList.getByRole("button", { name: /Què significa/ });
  await expect(componentLabels.first()).toHaveText(/\S+/);
  await expect(componentValues.first()).toHaveText(/^\d+%$/);
  const renderedComponentCount = await componentLabels.count();
  await expect(componentHelp).toHaveCount(renderedComponentCount);
  await componentHelp.first().focus();
  const firstTooltipId = await componentHelp.first().getAttribute("aria-describedby");
  expect(firstTooltipId).toBeTruthy();
  await expect(page.locator(`#${firstTooltipId}`)).toBeVisible();
  await expect(page.locator(`#${firstTooltipId}`)).toContainText(/\d+\/100/);
  const labels = await componentLabels.evaluateAll((elements) =>
    elements
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          text: element.textContent?.trim() ?? "",
          top: bounds.top,
          bottom: bounds.bottom,
        };
      })
      .filter((label) => label.text),
  );

  expect(labels.length).toBeGreaterThan(0);
  expect(labels.map((label) => label.text)).not.toContain(
    "Cobertura d’hàbitat compatible",
  );
  for (const [index, label] of labels.entries()) {
    if (index === 0) continue;
    expect(label.top).toBeGreaterThanOrEqual(labels[index - 1].bottom);
  }
  await expect(chart.locator(".factor-scale")).toHaveCount(0);

  await page.setViewportSize({ width: 320, height: 720 });
  const compactMapLayout = await page.evaluate(() => {
    const score = document.querySelector(".map-floating-card")?.getBoundingClientRect();
    const reset = document.querySelector(".map-reset-button")?.getBoundingClientRect();
    const layers = document
      .querySelector(".map-cell-visibility-panel-toggle")
      ?.getBoundingClientRect();
    const overlaps = (first?: DOMRect, second?: DOMRect) => Boolean(
      first && second &&
      first.left < second.right &&
      first.right > second.left &&
      first.top < second.bottom &&
      first.bottom > second.top
    );
    return {
      documentWidth: document.documentElement.scrollWidth,
      scoreOverlapsLayers: overlaps(score, layers),
      scoreOverlapsReset: overlaps(score, reset),
      viewportWidth: window.innerWidth,
    };
  });
  expect(compactMapLayout.documentWidth).toBeLessThanOrEqual(
    compactMapLayout.viewportWidth,
  );
  expect(compactMapLayout.scoreOverlapsLayers).toBe(false);
  expect(compactMapLayout.scoreOverlapsReset).toBe(false);

  const mobileNav = page.locator(".mobile-nav");
  await page.locator('summary[aria-label="Navegació"]').click();
  await expect(mobileNav).toHaveAttribute("open", "");
  await page
    .getByRole("navigation", { name: "Navegació mòbil" })
    .getByRole("link", { name: "Bolets", exact: true })
    .click();
  await expect(page).toHaveURL("/bolets");
  await expect(mobileNav).not.toHaveAttribute("open", "");
});

test("starts a zone habitat map at its selected zone", async ({
  context,
  page,
}) => {
  const currentLocation = { longitude: 2.15, latitude: 41.39 };
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(currentLocation);
  const habitatRequests: URL[] = [];
  await page.route("**/api/habitat?*", (route) => {
    habitatRequests.push(new URL(route.request().url()));
    return route.fulfill({
      json: {
        cells: [],
        truncated: false,
        occurrenceEvidence: { available: true, cells: [] },
      },
    });
  });

  await page.goto("/bolets/boletus-edulis?region=pirineus");
  await page.locator("#distribució").scrollIntoViewIfNeeded();

  // Requests arrive as cache-aligned buckets, so the initial zone load is a
  // batch of tiles whose union must cover the region.
  await expect.poll(() => {
    const initial = habitatRequests.filter(
      (url) => url.searchParams.get("resolution") === "10000",
    );
    if (initial.length === 0) return false;
    const west = Math.min(...initial.map((url) => Number(url.searchParams.get("west"))));
    const east = Math.max(...initial.map((url) => Number(url.searchParams.get("east"))));
    const south = Math.min(...initial.map((url) => Number(url.searchParams.get("south"))));
    const north = Math.max(...initial.map((url) => Number(url.searchParams.get("north"))));
    return west <= 0.1 && east >= 2.72 && south <= 42.25 && north >= 42.92;
  }, { timeout: 12_000 }).toBe(true);
  const locationRequest = page.waitForRequest((request) => {
    if (!request.url().includes("/api/habitat?")) return false;
    const url = new URL(request.url());
    return Number(url.searchParams.get("west")) < currentLocation.longitude &&
      Number(url.searchParams.get("east")) > currentLocation.longitude &&
      Number(url.searchParams.get("south")) < currentLocation.latitude &&
      Number(url.searchParams.get("north")) > currentLocation.latitude;
  });
  await page.locator(".maplibregl-ctrl-geolocate").click();
  await locationRequest;
});

test("starts a local guide habitat map at its local area", async ({ page }) => {
  const habitatRequests: URL[] = [];
  await page.route("**/api/habitat?*", (route) => {
    habitatRequests.push(new URL(route.request().url()));
    return route.fulfill({
      json: {
        cells: [],
        truncated: false,
        occurrenceEvidence: { available: true, cells: [] },
      },
    });
  });

  await page.goto("/zones/ripolles/les-lloses/ceps");
  await page.getByRole("heading", { name: /On podria créixer a les Lloses/i }).scrollIntoViewIfNeeded();

  // The initial view loads as a batch of cache-aligned buckets; the guide's
  // local area must be among them, requested at a local (sub-half-degree)
  // resolution.
  await expect.poll(() => habitatRequests.some((url) => {
    const west = Number(url.searchParams.get("west"));
    const east = Number(url.searchParams.get("east"));
    const south = Number(url.searchParams.get("south"));
    const north = Number(url.searchParams.get("north"));
    return west < 2.1167 && east > 2.1167 &&
      south < 42.1506 && north > 42.1506 &&
      east - west < 0.5 && north - south < 0.5;
  }), { timeout: 12_000 }).toBe(true);
});

test("keeps ecologically excluded cells clickable after changing species", async ({
  page,
}) => {
  const cellBounds = [[-0.5, 40.1], [3.9, 43.2]];

  await page.route("**/api/predictions/history?*", (route) => route.fulfill({
    json: {
      modelVersion: "test-hydrothermal-v1",
      observed: [
        {
          observedAt: "2026-10-14T12:00:00.000Z",
          score: 44,
          fruitingConditionsScore: 70,
          opportunityIndex: 44,
        },
        {
          observedAt: "2026-10-15T12:00:00.000Z",
          score: 50,
          fruitingConditionsScore: 75,
          opportunityIndex: 50,
        },
      ],
      forecast: {
        generatedAt: "2026-10-15T13:00:00.000Z",
        calibratedAt: "2026-10-15T12:00:00.000Z",
        correctionMethod: "observed-anomaly-v1",
        anchor: {
          observedAt: "2026-10-15T12:00:00.000Z",
          score: 50,
          fruitingConditionsScore: 75,
          opportunityIndex: 50,
        },
        source: ["ECMWF IFS HRES via Open-Meteo"],
        sourceResolutionM: 9000,
        points: [1, 2, 3, 4, 5].map((horizonDays) => ({
          validAt: new Date(Date.parse("2026-10-15T12:00:00.000Z") + horizonDays * 86_400_000).toISOString(),
          score: 50 + horizonDays * 4,
          fruitingConditionsScore: 75 + horizonDays * 3,
          opportunityIndex: 50 + horizonDays * 4,
          horizonDays,
          horizonConfidence: horizonDays === 1 ? "high" : horizonDays <= 3 ? "moderate" : "limited",
        })),
      },
    },
  }));

  await page.route("**/api/predictions?*", async (route) => {
    const url = new URL(route.request().url());
    const speciesId = url.searchParams.get("species") ?? "boletus-edulis";
    const excluded = speciesId === "lactarius-deliciosus";
    const mapCell = {
      speciesId,
      cellId: "excluded-test-cell",
      regionId: "pirineus",
      gridSizeM: 2500,
      cellBounds,
      score: excluded ? 0 : 60,
      habitatCoverage: excluded ? 0 : 0.75,
      label: excluded ? "molt baixa" : "alta",
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
            fruitingConditionsScore: excluded ? 60 : 80,
            opportunityIndex: excluded ? 0 : 60,
            effectiveHabitatCoverage: excluded ? 0 : 0.75,
            values: {
              altitudeM: excluded ? 2200 : 1200,
              habitatCoveragePercent: excluded ? 0 : 75,
              habitatAltitudeSuitability: excluded ? 0 : 100,
              soilTexture: "franca",
              rainfall21dMm: 60,
              rainfallDays21d: 6,
              evapotranspiration21dMm: 30,
              rainfall26dMm: 70,
              rainfallDays26d: 7,
              evapotranspiration26dMm: 35,
              drySpellDays: 0,
              soilMoistureMin7d: 0.25,
              soilMoistureAvg7d: 0.3,
              temperatureAvg7dC: 14,
              relativeHumidityAvg7d: 80,
              temperatureAvg20dC: 14,
              frostHours20d: 0,
              heatHours20d: 0,
            },
            modelVersion: "test",
            components: [
              {
                id: "habitatCoverage",
                label: "Coberta d’hàbitat compatible",
                score: excluded ? 0 : 75,
                state: excluded ? "unfavourable" : "favourable",
              },
              {
                id: "altitude",
                label: "Idoneïtat altitudinal dins l’hàbitat",
                score: excluded ? 0 : 100,
                state: excluded ? "unfavourable" : "favourable",
              },
              { id: "phenology", label: "Fenologia", score: 90, state: "favourable" },
              { id: "water", label: "Estat hídric unificat", score: 80, state: "favourable" },
              { id: "temperature", label: "Resposta tèrmica", score: 95, state: "favourable" },
              { id: "extremes", label: "Exposició a gelada i calor", score: 100, state: "favourable" },
            ],
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
  await expect(page.locator(".map-data-state")).toContainText("Predicció disponible");

  await page.getByLabel("Espècie seleccionada").click();
  await page.getByRole("option", { name: "Pinetell", exact: true }).click();
  await expect(page).toHaveURL(/species=lactarius-deliciosus/, { timeout: 10_000 });
  const mapDataState = page.locator(".map-data-state");
  await expect(mapDataState.locator("strong")).toHaveText(
    "1 cel·les amb puntuació 0",
  );
  await expect(mapDataState).toContainText(
    "Es mostren en vermell: ara no tenen hàbitat compatible",
  );

  const mapCanvas = page.locator(".full-map .maplibregl-canvas");
  await mapCanvas.hover();
  await expect(mapCanvas).toHaveCSS("cursor", "pointer");
  await mapCanvas.click();
  await expect(page.locator(".map-floating-card strong")).toHaveText("0/100");
  await expect(page.getByRole("heading", { name: "Evolució recent i projecció a 5 dies" })).toBeVisible();
  await expect(page.locator(".cell-score-history-legend")).toContainText("Calculat");
  await expect(page.locator(".cell-score-history-legend")).toContainText("Projectat");
  await expect(page.getByText(/D’ara a \+5 dies: \+20 punts/)).toBeVisible();
  await page.getByRole("button", { name: "Com es calcula aquesta projecció" }).focus();
  await expect(page.getByText(/No és una predicció de l’aparició de bolets/)).toBeVisible();
  await expect(page.locator(".forecast-confidence-list")).toHaveCount(0);
  await expect(page.locator(".cell-score-history table tbody tr")).toHaveCount(7);

  await page.setViewportSize({ width: 390, height: 844 });
  const hasHorizontalOverflow = await page.locator(".cell-score-history").evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  const chartFitsHost = await page.locator(".cell-score-history-chart").evaluate((host) => {
    const plot = host.querySelector<HTMLElement>(".uplot");
    return plot !== null && plot.getBoundingClientRect().width <= host.getBoundingClientRect().width + 1;
  });
  expect(chartFitsHost).toBe(true);
});
