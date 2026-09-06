// Captures the views used inside the lenses of the app-promo single:
// catalogue cards (cep, rovelló) and guide pages, from the live site.
//   node scripts/capture-promo-single.mjs            # https://bolets.app
//   CAPTURE_BASE_URL=http://localhost:3000 node scripts/capture-promo-single.mjs
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "video/assets/captures/mobile");
const base = process.env.CAPTURE_BASE_URL ?? "https://bolets.app";
const viewport = { width: 540, height: 960 };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ca-ES" });
const page = await context.newPage();

async function open(path) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "body > header, .site-header { display: none !important; }" });
  await page.waitForTimeout(600);
}

async function cardFor(slug) {
  const link = page.locator(`a[href="/bolets/${slug}"]`).first();
  await link.scrollIntoViewIfNeeded();
  const box = await link.boundingBox();
  if (box && box.height > 300) return link;
  for (const ancestor of ["ancestor::article[1]", "ancestor::li[1]", "ancestor::div[contains(@class, 'card')][1]"]) {
    const candidate = link.locator(`xpath=${ancestor}`);
    if (await candidate.count()) return candidate.first();
  }
  return link;
}

await mkdir(outDir, { recursive: true });
await open("/bolets");
for (const slug of ["cep", "rovello"]) {
  const card = await cardFor(slug);
  // Card photographs are lazy-loaded: wait until every image in the card has decoded.
  await card.locator("img").first().waitFor({ state: "visible" });
  await card.evaluate((element) => Promise.all(
    Array.from(element.querySelectorAll("img")).map((image) => (
      image.complete && image.naturalWidth > 0 ? Promise.resolve() : new Promise((done) => { image.onload = done; image.onerror = done; })
    )),
  ));
  await page.waitForTimeout(900);
  await card.screenshot({ path: resolve(outDir, `m11-catalogue-card-${slug}.png`), animations: "disabled" });
  console.log(`card ${slug}:`, JSON.stringify(await card.boundingBox()));
}
for (const [path, file] of [["/parts-dun-bolet", "m11-parts-dun-bolet.png"], ["/bolets/infografia", "m11-infografia.png"], ["/bolets/cep", "m11-guide-cep.png"]]) {
  await open(path);
  await page.screenshot({ path: resolve(outDir, file), fullPage: true, animations: "disabled" });
  console.log(`page ${path} → ${file}`);
}
await browser.close();
