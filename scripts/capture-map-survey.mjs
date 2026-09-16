import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { captureSurveyForecast } from './capture-map-survey-forecast.mjs';

// Map screenshots use the real local renderer with explicitly synthetic scores.
// The forecast artwork captures the product chart with labelled demonstration data.
// No account privileges are granted and no protected map endpoint is queried.
const origin = process.env.SURVEY_CAPTURE_ORIGIN ?? 'http://localhost:3101';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) {
  throw new Error('Illustration captures must run against a local server.');
}
const out = resolve('artifacts/map-survey-captures');
const media = resolve('public/media/editorial/map-survey');
await mkdir(out, { recursive: true });
await mkdir(media, { recursive: true });
const browser = await chromium.launch({ headless: true });
const centre = { longitude: 1.685, latitude: 42.185 };
const mx = 111320 * Math.cos(centre.latitude * Math.PI / 180);
const my = 110574;

// Fine illustrative field, then average it for coarser views. This is an
// explanation fixture, not another prediction model or real environmental data.
function sample(x, y, day = 0) {
  return Math.max(0, Math.min(82,
    20 + 56 * Math.exp(-((x - 450 - day * 170) ** 2 + (y - 400) ** 2) / 1900000)
    + 23 * Math.exp(-((x + 1400) ** 2 + (y + 700) ** 2) / 600000)
    - 28 * Math.exp(-((x + 50) ** 2 + (y + 350) ** 2) / 170000)));
}
function cellsFor(url) {
  const q = url.searchParams;
  const size = Number(q.get('resolution'));
  const day = Number(q.get('time') ?? 0);
  const cells = [];
  const west = (Number(q.get('west')) - centre.longitude) * mx;
  const east = (Number(q.get('east')) - centre.longitude) * mx;
  const south = (Number(q.get('south')) - centre.latitude) * my;
  const north = (Number(q.get('north')) - centre.latitude) * my;
  for (let x = Math.floor(Math.max(west, -25000) / size) * size; x < Math.min(east, 25000); x += size) {
    for (let y = Math.floor(Math.max(south, -25000) / size) * size; y < Math.min(north, 25000); y += size) {
      let score = 0, count = 0;
      for (let dx = 125; dx < size; dx += 250) for (let dy = 125; dy < size; dy += 250) {
        score += sample(x + dx, y + dy, day); count++;
      }
      cells.push({
        cellId: `illustration:${size}:${x}:${y}`, gridSizeM: size,
        score: Math.round(score / count), habitatCoverage: 0.85,
        cellBounds: [[centre.longitude + x / mx, centre.latitude + y / my],
          [centre.longitude + (x + size) / mx, centre.latitude + (y + size) / my]],
      });
    }
  }
  return { cells, truncated: false };
}

try {
  const mapCaptures = process.argv.includes('--forecast-only') ? [] : [['public-2500m', 2500], ['detail-250m', 250]];
  for (const [name, floor] of mapCaptures) {
    const context = await browser.newContext({
      viewport: { width: 1000, height: 720 }, deviceScaleFactor: 1.5,
      serviceWorkers: 'block', extraHTTPHeaders: { DNT: '1' }, locale: 'ca-ES',
    });
    await context.addInitScript(() => sessionStorage.setItem('bolets:map-price-v8:dismissed', '1'));
    await context.route('https://analytics.bolets.app/**', route => route.abort());
    const page = await context.newPage();
    const resolutions = new Set();
    await page.route('**/api/me/contributor-access', route => route.fulfill({ json: {
      authenticated: floor < 2500, active: floor < 2500,
      level: floor === 250 ? 'contributor' : 'public', minimumResolutionM: floor,
    } }));
    await page.route('**/api/predictions?*', route => {
      const url = new URL(route.request().url());
      resolutions.add(Number(url.searchParams.get('resolution')));
      return route.fulfill({ json: cellsFor(url) });
    });
    await page.goto(`${origin}/map/cep?west=1.65&south=42.15&east=1.72&north=42.22`);
    await page.locator('.raster-map-surface').waitFor({ state: 'visible' });
    for (let step = 0; step < 2; step++) {
      await page.getByRole('button', { name: 'Apropar', exact: true }).click();
      await page.waitForTimeout(500);
    }
    await page.waitForFunction(() => document.querySelector('.region-map')?.getAttribute('aria-busy') === 'false');
    await page.waitForFunction(() => {
      const tiles = [...document.querySelectorAll('.leaflet-tile')];
      return tiles.length > 0 && tiles.every(tile => tile.complete && tile.naturalWidth > 0);
    }, { timeout: 30000 });
    if (!resolutions.has(floor)) throw new Error(`Missing expected ${floor} m data`);
    await page.addStyleTag({ content: `
      .map-detail-panel, .map-page-heading, .map-cell-visibility, .map-controls-toggle,
      .leaflet-control-attribution, .maplibregl-ctrl-top-right, nextjs-portal { visibility: hidden !important; }
    ` });
    await page.locator('.map-stage').evaluate((stage, label) => {
      const badge = document.createElement('div');
      badge.textContent = label + ' · Dades de demostració';
      Object.assign(badge.style, {
        position: 'absolute', top: '18px', left: '18px', zIndex: '10', padding: '10px 14px',
        background: '#fbf7e9', color: '#34483a', borderRadius: '8px',
        fontSize: 'var(--text-base)', fontWeight: '800',
      });
      stage.append(badge);
    }, floor === 250 ? 'Detall de 250 m' : 'Mapa públic de 2,5 km');
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    await page.waitForTimeout(250);
    const png = await page.locator('.map-stage').screenshot({ path: resolve(out, `${name}.png`) });
    await sharp(png).webp({ quality: 88 }).toFile(resolve(media, `${name}.webp`));
    await context.close();
  }
  await captureSurveyForecast(browser, origin, out, media);
  const files = await Promise.all(['public-2500m.webp', 'detail-250m.webp', 'forecast-chart.webp'].map(async name => ({
    path: `public/media/editorial/map-survey/${name}`,
    sha256: createHash('sha256').update(await readFile(resolve(media, name))).digest('hex'),
  })));
  await writeFile(resolve('docs/map-price-survey-captures.json'), JSON.stringify({
    capturedAt: new Date().toISOString(), origin, species: 'boletus-edulis',
    description: 'Map screenshots use synthetic illustrative data at matching camera, not current readings. Forecast chart uses the real product renderer with synthetic demonstration points through +14 days, not current readings.',
    baseline: 'ICGC relief/reference; ICGC, OpenMapTiles and OpenStreetMap attribution appears below the comparison on the survey page',
    files,
  }, null, 2));
} finally {
  await browser.close();
}
