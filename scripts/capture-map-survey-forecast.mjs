import { resolve } from 'node:path';
import sharp from 'sharp';

// Capture the product's real chart with deterministic illustration data only.
export async function captureSurveyForecast(browser, origin, out, media) {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1.5,
    serviceWorkers: 'block', extraHTTPHeaders: { DNT: '1' }, locale: 'ca-ES',
  });
  try {
    await context.addInitScript(() => sessionStorage.setItem('bolets:map-price-v8:dismissed', '1'));
    await context.route('https://analytics.bolets.app/**', route => route.abort());
    await context.route('**/api/me/contributor-access', route => route.fulfill({ json: {
      authenticated: false, active: false, level: 'public', minimumResolutionM: 2500,
    } }));
    const date = day => new Date(Date.UTC(2026, 8, 16 + day, 12)).toISOString();
    const observed = [39, 42, 47, 50].map((score, index) => ({
      observedAt: date(index - 3), score, fruitingConditionsScore: score, opportunityIndex: score,
    }));
    await context.route('**/api/predictions/history?*', route => route.fulfill({ json: {
      modelVersion: 'survey-illustration', simulated: true, observed,
      forecast: {
        generatedAt: date(0), calibratedAt: date(0), anchor: observed.at(-1),
        correctionMethod: 'development-simulation-v1', simulated: true,
        source: ['Dades de demostració'], sourceResolutionM: 9000,
        points: [1, 2, 3, 4, 5, 7, 10, 12, 14].map((horizonDays, index) => ({
          validAt: date(horizonDays), horizonDays,
          score: [53, 57, 62, 66, 69, 72, 68, 64, 61][index],
          fruitingConditionsScore: null, opportunityIndex: null,
          horizonConfidence: horizonDays <= 3 ? 'moderate' : 'limited',
        })),
      },
    } }));
    await context.route('**/api/predictions?*', route => {
      const url = new URL(route.request().url());
      const cell = {
        cellId: 'survey-chart', speciesId: 'boletus-edulis', regionId: 'pirineus',
        gridSizeM: 2500, cellBounds: [[-0.5, 40.1], [3.9, 43.2]],
        score: 50, habitatCoverage: 0.75, label: 'moderada',
      };
      return route.fulfill({ json: url.searchParams.has('cell') ? { cell: {
        ...cell, observedAt: date(0), sourceResolutionM: 2500,
        confidence: 'high', stale: false, source: ['Dades de demostració'], unavailableFields: [],
        fruitingConditionsScore: 50, opportunityIndex: 50, effectiveHabitatCoverage: 0.75,
        values: { altitudeM: 1200, habitatCoveragePercent: 75, habitatAltitudeSuitability: 100,
          soilTexture: 'franca', rainfall21dMm: 60, rainfallDays21d: 6, evapotranspiration21dMm: 30,
          rainfall26dMm: 70, rainfallDays26d: 7, evapotranspiration26dMm: 35, drySpellDays: 0,
          soilMoistureMin7d: 0.25, soilMoistureAvg7d: 0.3, temperatureAvg7dC: 14,
          relativeHumidityAvg7d: 80, temperatureAvg20dC: 14, frostHours20d: 0, heatHours20d: 0 },
        modelVersion: 'survey-illustration', components: [], occurrenceEvidence: null,
        occurrenceEvidenceStatus: 'no-records',
      } } : { cells: [cell], truncated: false } });
    });
    const page = await context.newPage();
    await page.goto(`${origin}/map/cep?west=1.65&south=42.15&east=1.72&north=42.22`);
    const surface = page.locator('.raster-map-surface');
    await surface.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('.region-map')?.getAttribute('aria-busy') === 'false');
    await surface.click({ position: { x: 400, y: 230 } });
    await page.getByRole('button', { name: 'Detalls', exact: true }).click();
    const chart = page.locator('.cell-score-history');
    await chart.locator('canvas').waitFor({ state: 'visible' });
    // Keep screenshot context explicit; the actual model and chart are unchanged.
    await chart.locator('h4').evaluate(e => { e.textContent = 'Evolució recent i previsió a 14 dies'; });
    await chart.locator('.cell-score-history-simulation').evaluate(e => { e.textContent = 'Dades de demostració'; });
    await chart.evaluate(e => {
      Object.assign(e.style, { position: 'fixed', left: '30px', top: '30px', width: '1240px',
        padding: '24px', background: '#fbf7e9', zIndex: '9999', borderRadius: '16px' });
    });
    await page.addStyleTag({ content: 'body * { visibility: hidden !important; } .cell-score-history, .cell-score-history * { visibility: visible !important; } .cell-score-history-tooltip { visibility: hidden !important; }' });
    await page.waitForTimeout(300);
    await chart.screenshot({ path: resolve(out, 'forecast-chart.png') });
    await sharp(resolve(out, 'forecast-chart.png')).webp({ quality: 90 }).toFile(resolve(media, 'forecast-chart.webp'));
  } finally { await context.close(); }
}
