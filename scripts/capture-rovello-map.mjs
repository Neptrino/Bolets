// Captures the rovelló map for a few territorial windows and regions so the
// promo ad can show a window with colour in it. Output: video/assets/captures/mobile/m12-map-rovello-*.png
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "video/assets/captures/mobile");
const base = process.env.CAPTURE_BASE_URL ?? "https://bolets.app";
const views = [
  ["aran", "west=0.65&south=42.55&east=1.05&north=42.9"],
  ["cerdanya", "west=1.55&south=42.25&east=2.05&north=42.55"],
  ["ripolles", "west=2.05&south=42.15&east=2.55&north=42.5"],
  ["solsones", "west=1.35&south=41.85&east=1.85&north=42.2"],
  ["montseny", "region=montseny"],
  ["prepirineus", "region=prepirineus"],
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ca-ES" });
const page = await context.newPage();
await mkdir(outDir, { recursive: true });
for (const [name, query] of views) {
  await page.goto(`${base}/map/rovello?${query}`, { waitUntil: "load" });
  await page.addStyleTag({ content: "body > header, .site-header { display: none !important; }" });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: resolve(outDir, `m12-map-rovello-${name}.png`), animations: "disabled" });
  console.log(`captured ${name}`);
}
await browser.close();
