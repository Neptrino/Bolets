import { expect, test } from "@playwright/test";

test("explores the species atlas and comparison tools", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /On viuen els bolets abans de trobar-los/i }),
  ).toBeVisible();
  await expect(page.locator('header a[href="/map"]')).toHaveCount(1);
  await expect(page.locator('header a[href="/map"]')).toHaveText(
    "Mapa de predicció",
  );
  await expect(page.locator(".primary-nav > a")).toHaveText([
    "Bolets",
    "Zones",
    "Guies",
    "Comparador",
    "Mètode",
    "Avui",
  ]);
  await expect(
    page.locator(".hero").getByRole("link", { name: "Mapa de predicció" }),
  ).toHaveAttribute("href", "/map");
  await expect(page.locator(".featured-grid .card-season")).toHaveCount(0);

  await page.goto("/bolets");
  await page.getByRole("textbox", { name: "Cerca espècies" }).fill("rossinyol");
  await expect(page.getByRole("link", { name: /Rossinyol/i })).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: "Obriu la fitxa de Rossinyol" })
      .locator(".culinary-rating"),
  ).toHaveText("Excel·lent");
  const rossinyolCard = page.getByRole("link", {
    name: "Obriu la fitxa de Rossinyol",
  });
  await expect(rossinyolCard.locator(".card-season-month")).toHaveCount(12);
  await expect(
    rossinyolCard.locator('.card-season-month[aria-current="date"]'),
  ).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Cep rogenc/i })).toHaveCount(0);

  await page.goto("/bolets/boletus-edulis");
  await expect(
    page.getByRole("heading", { name: "Cep", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".species-hero .culinary-rating")).toHaveAccessibleName(
    "Valor culinari orientatiu: Excel·lent, 3 de 3 estrelles",
  );
  await expect(page.locator(".section-kicker svg")).toHaveCount(4);
  await expect(
    page.getByRole("heading", { name: "De la cistella a la cuina" }),
  ).toBeVisible();
  await expect(page.getByText("Per què aquesta nota?", { exact: true })).toBeVisible();
  const culinaryRatingHelp = page.getByRole("button", {
    name: "Com s’interpreta el valor culinari",
  });
  await expect(
    page.getByText(
      "Les estrelles valoren l’interès gastronòmic; la classificació de consum indica si calen condicions de seguretat.",
      { exact: true },
    ),
  ).not.toBeVisible();
  await culinaryRatingHelp.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(page.getByText("Sabor i aroma", { exact: true })).toBeVisible();
  await expect(page.getByText("Abans de menjar", { exact: true })).toBeVisible();
  await expect(page.getByText("Com conservar-lo", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Condicions actuals" }),
  ).toHaveCount(0);
  await expect(page.locator(".species-disclosure")).toHaveCount(2);
  await expect(
    page.getByText(
      "Fagedes, avetanoses, rouredes i pinedes de muntanya",
      { exact: true },
    ),
  ).toBeVisible();
  const expandedSpeciesHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  expect(expandedSpeciesHeight).toBeLessThan(6300);
  const climateDisclosure = page
    .locator(".disclosure-grid .species-disclosure")
    .filter({ hasText: "Clima i pluja" });
  await expect(page.locator(".ecology-detail-panel summary")).toHaveCount(0);
  await expect(
    climateDisclosure.getByText("Després de ploure", { exact: true }),
  ).toBeVisible();
  const climateDisclosureWidths = await climateDisclosure.evaluate((details) => ({
    details: details.getBoundingClientRect().width,
    grid: details.parentElement?.getBoundingClientRect().width ?? 0,
    }));
  expect(
    Math.abs(climateDisclosureWidths.details - climateDisclosureWidths.grid),
  ).toBeLessThan(2);
  await expect(
    page.getByRole("heading", { name: "On podria créixer a Catalunya" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "És un mapa de compatibilitat ecològica, no una predicció d’avui.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.locator("#distribució").scrollIntoViewIfNeeded();
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
  await expect(
    page.getByText(/límits d’altitud\s+tenen una transició suau/i),
  ).toBeVisible();
  await expect(page.getByText(/no indica presència actual/i)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Obrir el mapa interactiu/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Veure el mapa a pantalla completa" }),
  ).toBeVisible();
  const layerControls = page.getByRole("group", { name: "Capes del mapa" });
  await expect(layerControls).toBeHidden();
  await page.getByRole("button", { name: "Mostra els controls del mapa" }).click();
  await expect(layerControls).toBeVisible();
  const habitatMap = page.locator(".region-map-habitat");
  const habitatMapCanvas = habitatMap.locator(".maplibregl-canvas");
  await expect(
    page.getByLabel("Topogràfic: Mapa general de l’ICGC"),
  ).toBeChecked();
  await expect(
    page.getByLabel("Obert: Mapa estàndard d’OpenStreetMap"),
  ).toBeVisible();
  await expect(
    page.getByLabel("Ortofoto: Imatge aèria híbrida de l’ICGC"),
  ).toBeVisible();
  await expect(
    page.getByLabel("Gris: Mapa de l’ICGC amb menys contrast"),
  ).toBeVisible();
  await habitatMapCanvas.evaluate((element) => {
    element.setAttribute("data-basemap-canvas", "preserved");
  });
  await page.getByLabel("Obert: Mapa estàndard d’OpenStreetMap").check();
  await expect(habitatMap).toHaveAttribute("data-basemap", "open-map");
  await expect(habitatMapCanvas).toHaveAttribute(
    "data-basemap-canvas",
    "preserved",
  );
  await expect(page.getByText("Canviant el fons…")).toHaveCount(0);
  await expect(habitatMap.locator(".maplibregl-ctrl-attrib")).toBeVisible();
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
  const geolocateControl = page.locator(
    ".region-map-habitat .maplibregl-ctrl-geolocate",
  );
  const expandedOpacityPanel = page.locator(
    ".region-map-habitat .map-cell-visibility",
  );
  const habitatViewport = page.locator(
    ".region-map-habitat .region-map-viewport",
  );
  const [expandedBounds, geolocateBounds, habitatViewportBounds] = await Promise.all([
    expandedOpacityPanel.boundingBox(),
    geolocateControl.boundingBox(),
    habitatViewport.boundingBox(),
  ]);
  expect(expandedBounds).not.toBeNull();
  expect(geolocateBounds).not.toBeNull();
  expect(habitatViewportBounds).not.toBeNull();
  expect(
    Math.abs(
      expandedBounds!.x +
        expandedBounds!.width -
        (geolocateBounds!.x + geolocateBounds!.width),
    ),
  ).toBeLessThanOrEqual(0.5);
  expect(
    expandedBounds!.y - (geolocateBounds!.y + geolocateBounds!.height),
  ).toBe(10);
  expect(
    habitatViewportBounds!.y + habitatViewportBounds!.height -
      (expandedBounds!.y + expandedBounds!.height),
  ).toBeGreaterThanOrEqual(16);
  await page
    .getByRole("button", { name: "Amaga els controls del mapa" })
    .click();
  await expect(compatibilityOpacity).toBeHidden();
  await expect(historyOpacity).toBeHidden();
  await expect(compatibilityCanvas).toHaveCSS("opacity", "0.4");
  await expect(historyCanvas).toHaveCSS("opacity", "0.3");
  const collapsedOpacityControl = page.getByRole("button", {
    name: "Mostra els controls del mapa",
  });
  const [collapsedBounds, collapsedGeolocateBounds] = await Promise.all([
    collapsedOpacityControl.boundingBox(),
    geolocateControl.boundingBox(),
  ]);
  expect(collapsedBounds).not.toBeNull();
  expect(collapsedGeolocateBounds).not.toBeNull();
  expect(
    Math.abs(collapsedBounds!.x - collapsedGeolocateBounds!.x),
  ).toBeLessThanOrEqual(0.5);
  expect(collapsedBounds!.width).toBe(collapsedGeolocateBounds!.width);
  expect(
    collapsedBounds!.y -
      (collapsedGeolocateBounds!.y + collapsedGeolocateBounds!.height),
  ).toBe(10);
  await collapsedOpacityControl.click();
  await expect(compatibilityOpacity).toBeVisible();
  await expect(historyOpacity).toBeVisible();
  await page
    .getByRole("button", { name: "Amaga els registres històrics" })
    .click();
  await expect(historyCanvas).toHaveCSS("opacity", "0");
  await expect(compatibilityCanvas).toHaveCSS("opacity", "0.4");
  await page
    .getByRole("button", { name: "Mostra els registres històrics" })
    .click();
  await expect(historyCanvas).toHaveCSS("opacity", "0.3");
  const habitatLayout = await page
    .locator(".region-map-habitat")
    .evaluate((root) => {
      const viewport = root.querySelector(".region-map-viewport");
      const legend = root.querySelector(".habitat-map-legend");
      if (!viewport || !legend) return null;
      const viewportBounds = viewport.getBoundingClientRect();
      const legendBounds = legend.getBoundingClientRect();
      return {
        gap: legendBounds.top - viewportBounds.bottom,
        mapHeight: viewportBounds.height,
        legendHeight: legendBounds.height,
      };
    });
  expect(habitatLayout).not.toBeNull();
  expect(habitatLayout!.gap).toBeGreaterThanOrEqual(-1);
  expect(habitatLayout!.mapHeight).toBeGreaterThanOrEqual(559);
  expect(habitatLayout!.legendHeight).toBeLessThanOrEqual(160);
  const sectionSpacing = await page
    .locator(".content-section")
    .evaluateAll((sections) =>
      sections.map((section) => {
        const style = getComputedStyle(section);
        return parseFloat(style.paddingBottom) + parseFloat(style.marginBottom);
      }),
    );
  expect(Math.max(...sectionSpacing)).toBeLessThanOrEqual(72);

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
  const comparisonTable = page.getByRole("table", { name: "Cara a cara" });
  await expect(
    comparisonTable.getByRole("columnheader", { name: "Criteri" }),
  ).toBeVisible();
  await expect(
    comparisonTable.getByRole("columnheader", {
      name: "Espècie A: Cep, Boletus edulis",
    }),
  ).toContainText(/Cep\s*Boletus edulis/);
  await expect(
    comparisonTable.getByRole("columnheader", {
      name: "Espècie B: Pinetell, Lactarius deliciosus",
    }),
  ).toContainText(/Pinetell\s*Lactarius deliciosus/);
  const comparisonHeaderAlignment = await comparisonTable.evaluate((table) => {
    const headerCells = [
      table.querySelector(".compare-matrix-criterion"),
      table.querySelector(".compare-matrix-species-left"),
      table.querySelector(".compare-matrix-species-right"),
    ];
    const firstRowCells = [
      table.querySelector(".compare-matrix-row .compare-matrix-label"),
      table.querySelector(".compare-matrix-row .compare-matrix-cell-left"),
      table.querySelector(".compare-matrix-row .compare-matrix-cell-right"),
    ];

    return headerCells.map((headerCell, index) => {
      const dataCell = firstRowCells[index];
      if (!headerCell || !dataCell) return null;
      const headerBounds = headerCell.getBoundingClientRect();
      const dataBounds = dataCell.getBoundingClientRect();
      return {
        xDelta: Math.abs(headerBounds.x - dataBounds.x),
        widthDelta: Math.abs(headerBounds.width - dataBounds.width),
      };
    });
  });
  expect(comparisonHeaderAlignment).not.toContain(null);
  for (const track of comparisonHeaderAlignment) {
    expect(track?.xDelta ?? Infinity).toBeLessThan(2);
    expect(track?.widthDelta ?? Infinity).toBeLessThan(2);
  }
  const comparisonSeasons = page.locator(".compare-season");
  await expect(comparisonSeasons).toHaveCount(2);
  await expect(comparisonSeasons.first().locator(".card-season-month")).toHaveCount(12);
  await expect(comparisonSeasons.nth(1).locator(".card-season-month")).toHaveCount(12);
  await expect(comparisonSeasons.locator('.card-season-month[aria-current="date"]')).toHaveCount(2);
  await expect(comparisonSeasons.first().locator(".compare-season-summary")).toContainText("octubre");
  await expect(comparisonSeasons.nth(1).locator(".compare-season-summary")).toContainText("octubre");
  const rightSpeciesSelect = page.getByLabel("Seleccioneu l’espècie dreta");
  await rightSpeciesSelect.click();
  const speciesPopup = page.locator(".species-select-popup-comparison");
  await expect(speciesPopup).toBeVisible();
  await expect(
    speciesPopup.locator(".species-select-item:not([data-selected]) .species-select-item-text").first(),
  ).toHaveCSS("grid-column-start", "2");
  await expect
    .poll(async () => {
      const [triggerBox, popupBox] = await Promise.all([
        page.locator(".compare-profile-card-right .species-select-trigger").boundingBox(),
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
  await rightSpeciesSelect.press("r");
  await expect(rightSpeciesSelect).toHaveValue("r");
  await rightSpeciesSelect.press("o");
  await expect(rightSpeciesSelect).toHaveValue("ro");
  await rightSpeciesSelect.fill("rossinyol");
  await expect(speciesPopup.getByRole("option")).toHaveCount(1);
  await expect(speciesPopup.getByRole("option", { name: "Rossinyol" })).toBeVisible();
  await page.getByRole("option", { name: "Rossinyol" }).click();
  await expect(page).toHaveURL(/right=cantharellus-cibarius/);
  await expect(
    page.getByRole("columnheader", {
      name: "Espècie B: Rossinyol, Cantharellus cibarius",
    }),
  ).toContainText(/Rossinyol\s*Cantharellus cibarius/);

  await page.setViewportSize({ width: 320, height: 720 });
  const [leftMobileBox, rightMobileBox] = await Promise.all([
    page.getByLabel("Seleccioneu l’espècie esquerra").boundingBox(),
    page.getByLabel("Seleccioneu l’espècie dreta").boundingBox(),
  ]);
  expect(rightMobileBox?.y ?? 0).toBeGreaterThan(
    (leftMobileBox?.y ?? 0) + (leftMobileBox?.height ?? 0),
  );
  expect(leftMobileBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(rightMobileBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  const swapMobileBox = await page
    .getByRole("link", { name: "Intercanvia les espècies" })
    .boundingBox();
  expect(swapMobileBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(swapMobileBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  await expect(page.locator(".compare-matrix-cell-key").first()).toBeVisible();
  const compareMobileLayout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    quickFactsFit: [...document.querySelectorAll(".compare-quick-facts > span")]
      .every((fact) => fact.scrollWidth <= fact.clientWidth),
  }));
  expect(compareMobileLayout.scrollWidth).toBe(compareMobileLayout.clientWidth);
  expect(compareMobileLayout.quickFactsFit).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto("/map?species=boletus-edulis&region=pirineus");
  await expect(
    page.getByRole("heading", { name: "Mapa de condicions" }),
  ).toBeVisible();
  const mapSpeciesSearch = page.getByLabel("Espècie seleccionada");
  await expect(mapSpeciesSearch).toHaveCount(1);
  await mapSpeciesSearch.click();
  await mapSpeciesSearch.press("c");
  await expect(mapSpeciesSearch).toHaveValue("c");
  await mapSpeciesSearch.press("a");
  await expect(mapSpeciesSearch).toHaveValue("ca");
  await mapSpeciesSearch.press("Escape");
  await expect(mapSpeciesSearch).toHaveValue("Cep");
  await expect(page.locator(".species-switch-links")).toHaveCount(0);
  await expect(page.getByLabel("Àrea de Catalunya seleccionada")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: /Mapa interactiu de Catalunya/ }),
  ).toBeVisible();
  const desktopMapLayout = await page.evaluate(() => {
    const header = document.querySelector(".site-header")?.getBoundingClientRect();
    const picker = document
      .querySelector('[aria-label="Espècie seleccionada"]')
      ?.getBoundingClientRect();
    const stage = document.querySelector(".map-stage")?.getBoundingClientRect();
    return {
      headerHeight: header?.height ?? 0,
      pickerHeight: picker?.height ?? 0,
      stageTop: stage?.top ?? Infinity,
      stageWidth: stage?.width ?? 0,
      viewportWidth: window.innerWidth,
    };
  });
  expect(desktopMapLayout.headerHeight).toBeLessThanOrEqual(64);
  expect(desktopMapLayout.pickerHeight).toBeGreaterThanOrEqual(52);
  expect(desktopMapLayout.stageTop).toBeLessThan(310);
  expect(desktopMapLayout.stageWidth).toBeGreaterThanOrEqual(
    desktopMapLayout.viewportWidth - 32,
  );
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
  await expect(page.locator(".full-map")).toHaveAttribute(
    "aria-busy",
    "false",
    { timeout: 15_000 },
  );
  await expect(
    page.getByRole("button", { name: "Sortir de pantalla completa" }),
  ).toBeVisible();
  await expect(fullscreenSpeciesSelect).toHaveValue("Cep rogenc");
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
    /Predicció disponible|Resultats mixtos|cel·les|Apropa el mapa|No s’han pogut carregar/i,
  );
  await page
    .getByRole("button", { name: "Mostra els controls del mapa" })
    .click();
  const cellCanvas = page.locator(".full-map .region-map-cells");
  const cellOpacity = page.getByLabel("Opacitat de la predicció");
  await expect(cellOpacity).toBeVisible();
  await expect(cellOpacity).toHaveValue("100");
  await cellOpacity.fill("40");
  await expect(cellCanvas).toHaveCSS("opacity", "0.4");
  await page
    .getByRole("button", { name: "Amaga la predicció" })
    .click();
  await expect(cellCanvas).toHaveCSS("opacity", "0");
  await expect(cellOpacity).toBeDisabled();
  await page
    .getByRole("button", { name: "Mostra la predicció" })
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
  await page.getByRole("option", { name: "Pinetell", exact: true }).click();
  await expect(page).toHaveURL(/species=lactarius-deliciosus/);
  await expect(page.locator(".full-map")).toHaveAttribute(
    "aria-busy",
    "false",
    { timeout: 15_000 },
  );
  await expect(page.locator(".full-map .maplibregl-canvas")).toHaveAttribute(
    "data-viewport-instance",
    "preserved",
  );
});

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
  await page.route("**/api/habitat?*", (route) =>
    route.fulfill({
      json: {
        cells: [],
        truncated: false,
        occurrenceEvidence: { available: true, cells: [] },
      },
    }),
  );

  await page.goto("/bolets/boletus-edulis?region=pirineus");
  const habitatRequest = page.waitForRequest("**/api/habitat?*");
  await page.locator("#distribució").scrollIntoViewIfNeeded();

  const requestUrl = new URL((await habitatRequest).url());
  const west = Number(requestUrl.searchParams.get("west"));
  const south = Number(requestUrl.searchParams.get("south"));
  const east = Number(requestUrl.searchParams.get("east"));
  const north = Number(requestUrl.searchParams.get("north"));
  expect(west).toBeLessThanOrEqual(0.1);
  expect(east).toBeGreaterThanOrEqual(2.72);
  expect(south).toBeLessThanOrEqual(42.25);
  expect(north).toBeGreaterThanOrEqual(42.92);
  expect(requestUrl.searchParams.get("resolution")).toBe("10000");
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
  await page.route("**/api/habitat?*", (route) =>
    route.fulfill({
      json: {
        cells: [],
        truncated: false,
        occurrenceEvidence: { available: true, cells: [] },
      },
    }),
  );

  await page.goto("/zones/ripolles/les-lloses/ceps");
  const habitatRequest = page.waitForRequest("**/api/habitat?*");
  await page.getByRole("heading", { name: /On podria créixer a les Lloses/i }).scrollIntoViewIfNeeded();

  const requestUrl = new URL((await habitatRequest).url());
  const west = Number(requestUrl.searchParams.get("west"));
  const south = Number(requestUrl.searchParams.get("south"));
  const east = Number(requestUrl.searchParams.get("east"));
  const north = Number(requestUrl.searchParams.get("north"));
  expect(west).toBeLessThan(2.1167);
  expect(east).toBeGreaterThan(2.1167);
  expect(south).toBeLessThan(42.1506);
  expect(north).toBeGreaterThan(42.1506);
  expect(east - west).toBeLessThan(0.5);
  expect(north - south).toBeLessThan(0.5);
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

test("keeps rendered text at 12px or larger", async ({ page }) => {
  for (const route of ["/", "/bolets/boletus-edulis", "/compare", "/map", "/metode"]) {
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
  const predictionRequests: URL[] = [];
  await page.route("**/api/predictions?*", async (route) => {
    predictionRequests.push(new URL(route.request().url()));
    await route.fulfill({ json: { cells: [], truncated: false } });
  });

  await page.goto("/map?species=boletus-edulis");
  const map = page.locator(".full-map");
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
  await expect.poll(() => predictionRequests.some((request) => {
    const west = Number(request.searchParams.get("west"));
    const south = Number(request.searchParams.get("south"));
    const east = Number(request.searchParams.get("east"));
    const north = Number(request.searchParams.get("north"));
    return west <= 2.1734 && east >= 2.1734 &&
      south <= 41.3851 && north >= 41.3851;
  })).toBe(true);

  await page.getByLabel("Espècie seleccionada").click();
  await page.getByRole("option", { name: "Pinetell", exact: true }).click();
  await expect(page).toHaveURL(/species=lactarius-deliciosus/);
  await expect(locationDot).toBeVisible();
  await expect.poll(distanceFromMapCentre).toBeLessThan(80);

  await context.close();
});
