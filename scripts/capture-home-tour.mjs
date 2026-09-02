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

async function recordScene({ name, path, ready, action, settle = 1_000 }) {
  const page = await context.newPage();
  try {
    await page.goto(new URL(path, baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await waitForPage(page, ready);
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
