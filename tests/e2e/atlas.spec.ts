import { expect, test } from "@playwright/test";

test("explores the species atlas and comparison tools", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Bolets de Catalunya.*Mapa, espècies i temporada/i }),
  ).toBeVisible();
  await expect(page.locator('header a[href="/map"]')).toHaveCount(1);
  await expect(page.locator('header a[href="/map"]')).toHaveText(
    "Mapa de condicions",
  );
  await expect(page.locator('header > a[href="/el-meu-bosc"]')).toHaveText(
    "El meu bosc",
  );
  await expect(page.locator(".primary-nav > a")).toHaveText([
    "Bolets",
    "Troballes",
    "Zones",
    "Comparador",
    "Avui",
  ]);
  await expect(page.locator('footer a[href="/compare"]')).toHaveText(
    "Comparador d’espècies",
  );
  await expect(
    page.locator(".hero").getByRole("link", { name: "Mapa de bolets" }),
  ).toHaveAttribute("href", "/map");
  await expect(
    page.locator(".hero").getByRole("link", { name: "Guia d’espècies" }),
  ).toHaveAttribute("href", "/bolets");
  await expect(page.locator(".hero .home-showcase-trigger")).toHaveCount(0);
  await expect(page.locator(".featured-grid .card-season")).toHaveCount(0);

  await page.goto("/bolets");
  await page.getByRole("textbox", { name: "Cerca espècies" }).fill("rossinyol");
  await expect(page.getByRole("link", { name: "Obre la fitxa de Rossinyol" })).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: "Obre la fitxa de Rossinyol" })
      .locator(".culinary-rating"),
  ).toHaveText("Excel·lent");
  const rossinyolCard = page.getByRole("link", {
    name: "Obre la fitxa de Rossinyol",
  });
  await expect(rossinyolCard.locator(".card-season-month")).toHaveCount(12);
  await expect(
    rossinyolCard.locator('.card-season-month[aria-current="date"]'),
  ).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Cep rogenc/i })).toHaveCount(0);

  await page.goto("/bolets/cep");
  await expect(
    page.getByRole("heading", { name: "Cep", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".species-hero .culinary-rating")).toHaveAccessibleName(
    "Valor culinari orientatiu: Excel·lent, 3 de 3 estrelles",
  );
  await expect(page.locator(".section-kicker svg")).toHaveCount(5);
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
  expect(expandedSpeciesHeight).toBeLessThan(7500);
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
  await expect(page.getByText(/És un mapa dels terrenys on l’espècie podria créixer/)).toBeVisible();
  await page.locator("#distribució").scrollIntoViewIfNeeded();
  await expect(page.getByText("Observacions històriques agrupades per zona")).toBeVisible();
  await expect(
    page.getByText("Ratllat lila · registres històrics"),
  ).toBeVisible();
  await expect(page.getByText("Blau · terreny adequat")).toBeVisible();
  await expect(page.getByText("Dades de bosc, altitud i sòl", { exact: true })).toBeVisible();
  await expect(page.getByText("Hàbitat potencial", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/no confirma que hi hagi bolets/i)).toBeVisible();
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
    page.getByLabel("Relleu ombrejat: Relleu ombrejat amb referències topogràfiques de l’ICGC"),
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
    "Opacitat del terreny adequat",
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
  expect(habitatLayout!.gap).toBeGreaterThanOrEqual(-habitatLayout!.mapHeight);
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
    page.getByRole("heading", { name: "Dos bolets, cara a cara." }),
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
  const rightSpeciesSelect = page.getByLabel("Selecciona l’espècie dreta");
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
    page.getByLabel("Selecciona l’espècie esquerra").boundingBox(),
    page.getByLabel("Selecciona l’espècie dreta").boundingBox(),
  ]);
  expect(rightMobileBox?.y ?? 0).toBeGreaterThan(
    (leftMobileBox?.y ?? 0) + (leftMobileBox?.height ?? 0),
  );
  expect(leftMobileBox?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  expect(rightMobileBox?.height ?? 0).toBeGreaterThanOrEqual(43.5);
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
    page.getByRole("heading", { name: "Mapa del cep a Catalunya" }),
  ).toBeVisible();
  await page.locator(".map-page-panel-summary").click();
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
  expect(desktopMapLayout.pickerHeight).toBeGreaterThanOrEqual(44);
  expect(desktopMapLayout.stageTop).toBeLessThan(320);
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
  await expect(
    page.getByRole("heading", { name: "Mapa de cep rogenc a Catalunya" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Veure el mapa a pantalla completa" }),
  ).toBeVisible();
  await expect(page.locator(".map-page .maplibregl-ctrl-geolocate")).toBeHidden();
  await expect(page.locator(".full-map")).toHaveAttribute(
    "aria-busy",
    "false",
    { timeout: 15_000 },
  );
  await page
    .getByRole("button", { name: "Mostra els controls del mapa" })
    .click();
  const cellCanvas = page.locator(".full-map .region-map-cells");
  const cellOpacity = page.getByLabel("Opacitat de les condicions actuals");
  await expect(cellOpacity).toBeVisible();
  await expect(cellOpacity).toHaveValue("100");
  await cellOpacity.fill("40");
  await expect(cellCanvas).toHaveCSS("opacity", "0.4");
  await page
    .getByRole("button", { name: "Amaga les condicions actuals" })
    .click();
  await expect(cellCanvas).toHaveCSS("opacity", "0");
  await expect(cellOpacity).toBeDisabled();
  await page
    .getByRole("button", { name: "Mostra les condicions actuals" })
    .click();
  await expect(cellCanvas).toHaveCSS("opacity", "0.4");
  await page.getByRole("button", { name: "Obre la informació del mapa" }).click();
  await expect(
    page.getByText("No mostra llocs on s’hagin trobat bolets."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tanca la informació del mapa" }).click();

  await page.locator(".map-page-panel-summary").click();
  await page.getByLabel("Espècie seleccionada").click();
  await page.getByRole("option", { name: "Pinetell", exact: true }).click();
  await expect(page).toHaveURL(/\/map\/pinetell\?region=pirineus/);
  await expect(page.getByRole("heading", { name: "Mapa del pinetell a Catalunya" })).toBeVisible();
  await expect(page.locator(".full-map")).toHaveAttribute(
    "aria-busy",
    "false",
    { timeout: 15_000 },
  );
});
