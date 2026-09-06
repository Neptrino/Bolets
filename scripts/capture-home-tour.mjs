import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.TOUR_BASE_URL ?? "https://bolets.app";
const requestedScene = process.env.TOUR_SCENE;
const captureDirectory = resolve("video/assets/captures");
const viewport = { width: 1600, height: 900 };

await mkdir(captureDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 1,
  colorScheme: "light",
  locale: "ca-ES",
  timezoneId: "Europe/Madrid",
  reducedMotion: "no-preference",
  serviceWorkers: "block",
  extraHTTPHeaders: { DNT: "1" },
});

await context.route("https://analytics.bolets.app/**", (route) => route.abort());

async function waitForPage(page, selector) {
  await page.locator(selector).first().waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(1_200);
  await page.addStyleTag({
    content: `
      html { scrollbar-width: none; }
      body::-webkit-scrollbar { display: none; }
      * { caret-color: transparent !important; }
    `,
  });
}

async function smoothScroll(page, target, duration = 1_800) {
  if (await page.locator(target).count() === 0) {
    throw new Error(`Cannot scroll: ${target} was not found`);
  }
  await page.evaluate(
    ({ selector, milliseconds }) => new Promise((resolveScroll) => {
      const element = document.querySelector(selector);
      if (!element) {
        resolveScroll(undefined);
        return;
      }

      const start = window.scrollY;
      const destination = Math.max(
        0,
        element.getBoundingClientRect().top + window.scrollY - 84,
      );
      const distance = destination - start;
      const startedAt = performance.now();

      const tick = (now) => {
        const elapsed = Math.min(1, (now - startedAt) / milliseconds);
        const eased = elapsed < 0.5
          ? 4 * elapsed * elapsed * elapsed
          : 1 - Math.pow(-2 * elapsed + 2, 3) / 2;
        window.scrollTo(0, start + distance * eased);
        if (elapsed < 1) requestAnimationFrame(tick);
        else resolveScroll(undefined);
      };

      requestAnimationFrame(tick);
    }),
    { selector: target, milliseconds: duration },
  );
}

async function waitForTimelineFrame(page, offset) {
  const mapSelector = ".current-map-overview .region-map";
  const range = page.locator(
    ".current-map-overview .prediction-timeline-range input[type='range']",
  );

  await range.evaluate((element, nextOffset) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(element, String(nextOffset));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, offset);
  await page.waitForFunction(
    ({ selector, expected }) =>
      document.querySelector(selector)?.value === String(expected),
    { selector: ".current-map-overview .prediction-timeline-range input[type='range']", expected: offset },
  );
  // Let the React effect mark the new map run as loading before waiting for
  // its final state. Returning immediately here can race the effect itself.
  await page.waitForTimeout(120);
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.getAttribute("aria-busy") !== "true",
    mapSelector,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(180);
}

async function preloadTimelineFrames(page) {
  // The RegionMap bucket store is keyed by the full timeline request URL and
  // survives offset changes. Visiting every offset once warms all nine frames
  // for the same viewport before the screencast begins.
  for (const offset of [-3, -2, -1, 0, 1, 2, 3, 4, 5]) {
    await waitForTimelineFrame(page, offset);
  }
  await waitForTimelineFrame(page, -3);
}

async function recordScene({ name, path, ready, prepare, action, settle = 1_000 }) {
  const page = await context.newPage();
  try {
    await page.goto(new URL(path, baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await waitForPage(page, ready);
    if (prepare) await prepare(page);
    await page.screenshot({
      path: resolve(captureDirectory, `${name}-start.png`),
      type: "png",
    });
    await page.screencast.start({
      path: resolve(captureDirectory, `${name}.webm`),
      size: viewport,
      quality: 92,
    });
    await page.waitForTimeout(700);
    await action(page);
    await page.waitForTimeout(settle);
    await page.screencast.stop();
    await page.screenshot({
      path: resolve(captureDirectory, `${name}.png`),
      type: "png",
    });
    console.log(`Captured ${name} from ${new URL(path, baseUrl).toString()}`);
  } finally {
    await page.close();
  }
}

async function captureScene(scene) {
  if (!requestedScene || requestedScene === scene.name) {
    await recordScene(scene);
  }
}

try {
  await captureScene({
    name: "01-home",
    path: "/",
    ready: ".hero h1",
    action: async (page) => {
      await page.waitForTimeout(900);
      await smoothScroll(page, ".home-today-feature", 2_000);
      await page.waitForTimeout(1_100);
      await smoothScroll(page, ".home-intro", 1_500);
    },
  });

  await captureScene({
    name: "06-avui",
    path: "/bolets-avui",
    ready: ".current-leader",
    action: async (page) => {
      await page.waitForTimeout(900);
      await smoothScroll(page, ".current-map-overview", 2_400);
      await page.waitForTimeout(1_300);
    },
  });

  await captureScene({
    name: "08-avui-evolution",
    path: "/bolets-avui",
    ready: ".current-map-overview .prediction-timeline-play",
    settle: 1_400,
    prepare: async (page) => {
      await smoothScroll(page, ".current-map-overview", 1_900);
      await page.waitForTimeout(900);
      await preloadTimelineFrames(page);
      // Cached offsets resolve in a microtask, but suppress the transient
      // loading affordances so a captured frame can never show a spinner.
      await page.addStyleTag({
        content: `
          .current-map-overview .prediction-timeline-loader,
          .current-map-overview .prediction-map-loading,
          .current-map-overview .map-refining-state { display: none !important; }
        `,
      });
      await page.waitForTimeout(350);
    },
    action: async (page) => {
      const play = page.locator(".current-map-overview .prediction-timeline-play");
      await play.click();
      await page.waitForTimeout(11_000);
    },
  });

  await captureScene({
    name: "02-map",
    path: "/map?species=lactarius-deliciosus",
    ready: ".maplibregl-canvas",
    settle: 1_600,
    action: async (page) => {
      await page.waitForTimeout(900);
      const zoomIn = page.locator(".maplibregl-ctrl-zoom-in").first();
      if (await zoomIn.isVisible()) {
        await zoomIn.click();
        await page.waitForTimeout(1_200);
      }

      const canvas = page.locator(".maplibregl-canvas").first();
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.58);
      }
      await page.waitForTimeout(2_200);
    },
  });

  await captureScene({
    name: "03-species",
    path: "/bolets/boletus-edulis",
    ready: "main h1",
    action: async (page) => {
      await page.waitForTimeout(800);
      const target = await page.locator(".ecology-snapshot").count()
        ? ".ecology-snapshot"
        : "main section:nth-of-type(2)";
      await smoothScroll(page, target, 2_300);
      await page.waitForTimeout(1_400);
    },
  });

  await captureScene({
    name: "07-guides",
    path: "/guies",
    ready: ".guides-species-module",
    action: async (page) => {
      await page.waitForTimeout(850);
      await smoothScroll(page, ".guides-directory", 2_400);
      await page.waitForTimeout(1_300);
    },
  });

  await captureScene({
    name: "04-catalogue",
    path: "/bolets",
    ready: "main h1",
    action: async (page) => {
      await page.waitForTimeout(800);
      await smoothScroll(page, ".directory-shell .species-grid", 2_500);
      await page.waitForTimeout(1_500);
    },
  });

  await captureScene({
    name: "05-findings",
    path: "/troballes",
    ready: "main h1",
    action: async (page) => {
      await page.waitForTimeout(850);
      await smoothScroll(page, ".findings-map-toolbar", 2_200);
      await page.waitForTimeout(1_300);
    },
  });
} finally {
  await browser.close();
}
