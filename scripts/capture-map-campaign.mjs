import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

// Phone-sized captures of the live product for the Instagram map campaign.
// Output: video/assets/captures/mobile/<scene>-start.png, <scene>.png and
// <scene>.mp4 (1080 × 1920, 30 fps). Motion scenes are recorded as bursts of
// device-pixel screenshots and assembled with ffmpeg, because Chromium's
// screencast only delivers CSS-pixel (540 × 960) frames under mobile emulation.
// Usage: node scripts/capture-map-campaign.mjs               (all scenes)
//        CAMPAIGN_SCENE=m01,m02 node scripts/capture-map-campaign.mjs

const baseUrl = process.env.TOUR_BASE_URL ?? "https://bolets.app";
const requestedScenes = (process.env.CAMPAIGN_SCENE ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const captureDirectory = resolve("video/assets/captures/mobile");
const viewport = { width: 540, height: 960 };
// Whole of Catalonia, inside the bounds the map accepts.
const cataloniaQuery = "west=0.15&south=40.52&east=3.3&north=42.88";

await mkdir(captureDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: "light",
  locale: "ca-ES",
  timezoneId: "Europe/Madrid",
  reducedMotion: "no-preference",
  serviceWorkers: "block",
  extraHTTPHeaders: { DNT: "1" },
});
await context.route("https://analytics.bolets.app/**", (route) => route.abort());

function runCommand(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolveRun() : reject(new Error(`${command} exited with code ${code}`))));
  });
}

async function waitForPage(page, selector) {
  await page.locator(selector).first().waitFor({ state: "visible", timeout: 25_000 });
  await page.waitForTimeout(1_000);
  await page.addStyleTag({
    content: `
      html { scrollbar-width: none; }
      body::-webkit-scrollbar { display: none; }
      * { caret-color: transparent !important; }
      body > header, .site-header { display: none !important; }
    `,
  });
  // Let MapLibre re-measure after the header disappears.
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(700);
}

async function scrollElementToTop(page, selector, offset = 24, duration = 1_600) {
  await page.evaluate(
    ({ target, top, milliseconds }) => new Promise((done) => {
      const element = document.querySelector(target);
      if (!element) { done(undefined); return; }
      const start = window.scrollY;
      const destination = Math.max(0, element.getBoundingClientRect().top + window.scrollY - top);
      const distance = destination - start;
      const startedAt = performance.now();
      const tick = (now) => {
        const elapsed = Math.min(1, (now - startedAt) / milliseconds);
        const eased = elapsed < 0.5 ? 4 * elapsed ** 3 : 1 - (-2 * elapsed + 2) ** 3 / 2;
        window.scrollTo(0, start + distance * eased);
        if (elapsed < 1) requestAnimationFrame(tick); else done(undefined);
      };
      requestAnimationFrame(tick);
    }),
    { target: selector, top: offset, milliseconds: duration },
  );
}

async function waitForMapIdle(page) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".maplibregl-canvas");
    return Boolean(canvas) && canvas.getAttribute("aria-busy") !== "true";
  }, undefined, { timeout: 30_000 });
  await page.waitForTimeout(2_200);
}

async function waitForTimelineFrame(page, offset) {
  const mapSelector = ".current-map-overview .region-map";
  const range = page.locator(".current-map-overview .prediction-timeline-range input[type='range']");
  await range.evaluate((element, nextOffset) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(element, String(nextOffset));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, offset);
  await page.waitForFunction(
    ({ selector, expected }) => document.querySelector(selector)?.value === String(expected),
    { selector: ".current-map-overview .prediction-timeline-range input[type='range']", expected: offset },
  );
  await page.waitForTimeout(120);
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.getAttribute("aria-busy") !== "true",
    mapSelector,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(180);
}

async function preloadTimelineFrames(page) {
  for (const offset of [-3, -2, -1, 0, 1, 2, 3, 4, 5]) await waitForTimelineFrame(page, offset);
  await waitForTimelineFrame(page, -3);
}

// Burst recorder: every snap() is a 1080 × 1920 JPEG; frame durations come from
// the wall clock, so the assembled video keeps the real pacing of the interaction.
function frameRecorder(page, directory) {
  const frames = [];
  let index = 0;
  const snap = async () => {
    const path = resolve(directory, `f${String(index).padStart(4, "0")}.jpg`);
    index += 1;
    const startedAt = Date.now();
    await page.screenshot({ path, type: "jpeg", quality: 92, animations: "allow", caret: "hide" });
    frames.push({ path, t: startedAt });
  };
  const snapFor = async (milliseconds, gap = 70) => {
    const end = Date.now() + milliseconds;
    while (Date.now() < end) {
      await snap();
      if (gap) await page.waitForTimeout(gap);
    }
  };
  return { frames, snap, snapFor };
}

async function encodeFrames(frames, directory, target, tailHoldMs) {
  const lines = [];
  frames.forEach((frame, position) => {
    const next = frames[position + 1];
    const duration = next ? Math.max(0.034, (next.t - frame.t) / 1000) : tailHoldMs / 1000;
    lines.push(`file '${frame.path}'`, `duration ${duration.toFixed(3)}`);
  });
  lines.push(`file '${frames.at(-1).path}'`);
  const list = resolve(directory, "frames.txt");
  await writeFile(list, `${lines.join("\n")}\n`);
  await runCommand("ffmpeg", [
    "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list,
    "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-movflags", "+faststart",
    target,
  ]);
}

async function tapCentreAndReport(page, name) {
  // Tap the middle of the map so the still carries the selected sector and its
  // score panel; the panel text is printed so compositions can quote real values.
  await page.touchscreen.tap(viewport.width / 2, viewport.height * 0.42);
  await page.waitForTimeout(2_200);
  const text = await page.evaluate(() => {
    const match = document.body.innerText.match(/(\d+)\/100[\s\S]{0,120}/);
    return match ? match[0].replace(/\s+/g, " ").slice(0, 140) : "no score";
  });
  console.log(`  ${name} centre sector: ${text}`);
}

async function recordScene({ name, path, ready, prepare, action, settle = 1_000, stillOnly = false, probe = false, fullPage = false }) {
  const page = await context.newPage();
  const framesDirectory = resolve(captureDirectory, `.frames-${name}`);
  try {
    await page.goto(new URL(path, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 40_000 });
    await waitForPage(page, ready);
    if (prepare) await prepare(page);
    if (probe) await tapCentreAndReport(page, name);
    await page.screenshot({ path: resolve(captureDirectory, `${name}-start.png`), type: "png", fullPage });
    if (stillOnly) {
      console.log(`Captured still ${name} from ${new URL(path, baseUrl).toString()}`);
      return;
    }
    await rm(framesDirectory, { recursive: true, force: true });
    await mkdir(framesDirectory, { recursive: true });
    const recorder = frameRecorder(page, framesDirectory);
    await recorder.snap();
    await page.waitForTimeout(700);
    await action(page, recorder);
    await recorder.snapFor(settle, 90);
    await page.screenshot({ path: resolve(captureDirectory, `${name}.png`), type: "png" });
    await encodeFrames(recorder.frames, framesDirectory, resolve(captureDirectory, `${name}.mp4`), 400);
    console.log(`Captured ${name} (${recorder.frames.length} frames) from ${new URL(path, baseUrl).toString()}`);
  } finally {
    await rm(framesDirectory, { recursive: true, force: true });
    await page.close();
  }
}

async function captureScene(scene) {
  if (requestedScenes.length === 0 || requestedScenes.some((prefix) => scene.name.startsWith(prefix))) {
    await recordScene(scene);
  }
}

try {
  // 1. Catalonia (cep map) → zoom into the Ripollès → tap the sector at Setcases.
  await captureScene({
    name: "m01-catalunya",
    path: `/map/cep?${cataloniaQuery}`,
    ready: ".maplibregl-canvas",
    settle: 1_000,
    prepare: waitForMapIdle,
    action: async (page, recorder) => {
      // Page coordinates (CSS px) over Setcases in the Catalonia view.
      const x = Number(process.env.CAMPAIGN_TAP_X ?? 340);
      const y = Number(process.env.CAMPAIGN_TAP_Y ?? 318);
      const startedAt = recorder.frames[0]?.t ?? Date.now();
      const elapsed = () => ((Date.now() - startedAt) / 1000).toFixed(2);
      await recorder.snapFor(250, 60);
      await page.mouse.move(x, y);
      // Two wheel bursts with a short pause: MapLibre merges wheel events that
      // arrive during an ongoing zoom animation, so one long burst zooms only ~1.5 levels.
      console.log(`  zoom starts at ${elapsed()} s`);
      for (let round = 0; round < 2; round += 1) {
        for (let step = 0; step < 7; step += 1) {
          await page.mouse.wheel(0, -70);
          await page.waitForTimeout(30);
          await recorder.snap();
        }
        await page.waitForTimeout(220);
        await recorder.snap();
      }
      // Wheel zoom tops out under mobile emulation; a touch double-tap zooms one
      // more level. It lands just north of the border (no cells) so it selects nothing.
      await page.touchscreen.tap(x, y - 18);
      await page.waitForTimeout(110);
      await page.touchscreen.tap(x, y - 18);
      await recorder.snapFor(900, 70);
      // Two taps in the zoomed view: the Camprodon-valley sector below Setcases, then
      // its western neighbour, so the panel shows two different readings.
      const taps = [
        [Number(process.env.CAMPAIGN_TAP2_X ?? 380), Number(process.env.CAMPAIGN_TAP2_Y ?? 380)],
        [Number(process.env.CAMPAIGN_TAP3_X ?? 330), Number(process.env.CAMPAIGN_TAP3_Y ?? 380)],
      ];
      for (const [tapX, tapY] of taps) {
        console.log(`  tap at (${tapX}, ${tapY}) at ${elapsed()} s`);
        await page.touchscreen.tap(tapX, tapY);
        await recorder.snapFor(1_900, 70);
        const text = await page.evaluate(() => {
          const match = document.body.innerText.match(/(\d+)\/100[\s\S]{0,90}/);
          return match ? match[0].replace(/\s+/g, " ").slice(0, 110) : "no score";
        });
        console.log(`  panel: ${text}`);
      }
    },
  });

  // 2. "Bolets avui" timeline from −3 to +5 days with every frame preloaded.
  await captureScene({
    name: "m02-avui-evolution",
    path: "/bolets-avui",
    ready: ".current-map-overview .prediction-timeline-play",
    settle: 1_400,
    prepare: async (page) => {
      await scrollElementToTop(page, ".current-map-frame", 20, 1_400);
      await page.waitForTimeout(900);
      await preloadTimelineFrames(page);
      await page.addStyleTag({
        content: `
          .current-map-overview .prediction-timeline-loader,
          .current-map-overview .prediction-map-loading,
          .current-map-overview .map-refining-state { display: none !important; }
        `,
      });
      await page.waitForTimeout(350);
    },
    action: async (page, recorder) => {
      await recorder.snapFor(600, 80);
      for (const offset of [-3, -2, -1, 0, 1, 2, 3, 4, 5]) {
        await waitForTimelineFrame(page, offset);
        await recorder.snap();
        await page.waitForTimeout(offset === 0 ? 1_400 : 950);
      }
    },
  });

  // 3–4. Same territory, two species (the map depends on the species).
  for (const [name, species] of [["m03-pirineus-pinetell", "pinetell"], ["m04-pirineus-cep", "cep"]]) {
    await captureScene({
      name,
      path: `/map/${species}?region=pirineus`,
      ready: ".maplibregl-canvas",
      prepare: waitForMapIdle,
      stillOnly: true,
    });
  }

  // 5–8. Same species, neighbouring territories (two territories, two signals).
  for (const region of ["pirineus", "prepirineus", "montseny", "emporda"]) {
    await captureScene({
      name: `m05-territori-${region}`,
      path: `/map/pinetell?region=${region}`,
      ready: ".maplibregl-canvas",
      prepare: waitForMapIdle,
      stillOnly: true,
    });
  }

  // 6. Same territory, several species, in both map modes (pick the clearest pair).
  for (const species of ["pinetell", "cep", "trompeta-de-la-mort", "rossinyol"]) {
    for (const mode of ["prediction", "compatibility"]) {
      await captureScene({
        name: `m06-montseny-${species}-${mode}`,
        path: `/map/${species}?region=montseny${mode === "compatibility" ? "&mode=compatibility" : ""}`,
        ready: ".maplibregl-canvas",
        prepare: waitForMapIdle,
        stillOnly: true,
      });
    }
  }

  // 7. Cep territories for the comparison Reel (region fits, plus a Ripollès window).
  for (const region of ["montseny", "emporda", "pirineus"]) {
    await captureScene({
      name: `m07-cep-${region}`,
      path: `/map/cep?region=${region}`,
      ready: ".maplibregl-canvas",
      prepare: waitForMapIdle,
      stillOnly: true,
    });
  }
  await captureScene({
    name: "m07-cep-ripolles",
    path: "/map/cep?west=1.95&south=42.05&east=2.75&north=42.52",
    ready: ".maplibregl-canvas",
    prepare: waitForMapIdle,
    stillOnly: true,
  });

  // 8. Pyrenean windows for the lens Reels: cep by valley (centre sector tapped and
  // reported), and every species/mode at Setcases for the species comparison.
  const windows = {
    aran: "west=0.65&south=42.55&east=1.05&north=42.9",
    cerdanya: "west=1.55&south=42.25&east=2.05&north=42.55",
    ripolles: "west=2.05&south=42.15&east=2.55&north=42.5",
  };
  for (const [valley, bounds] of Object.entries(windows)) {
    await captureScene({
      name: `m08-window-${valley}-cep`,
      path: `/map/cep?${bounds}`,
      ready: ".maplibregl-canvas",
      prepare: waitForMapIdle,
      stillOnly: true,
      probe: true,
    });
  }
  for (const [place, bounds] of [["setcases", windows.ripolles], ["aran", windows.aran]]) {
    for (const species of ["cep", "pinetell", "trompeta-de-la-mort", "rossinyol"]) {
      for (const mode of ["prediction", "compatibility"]) {
        await captureScene({
          name: `m08-${place}-${species}-${mode}`,
          path: `/map/${species}?${bounds}${mode === "compatibility" ? "&mode=compatibility" : ""}`,
          ready: ".maplibregl-canvas",
          prepare: waitForMapIdle,
          stillOnly: true,
        });
      }
    }
  }

  // 9a. Guide pages as full-page stills, panned inside a lens in the guide Reel.
  for (const [name, path, ready] of [
    ["m10-guide-catalogue", "/bolets", "main h1"],
    ["m10-guide-cep", "/bolets/boletus-edulis", "main h1"],
    ["m10-guide-rovello", "/bolets/lactarius-sanguifluus", "main h1"],
  ]) {
    await captureScene({
      name,
      path,
      ready,
      prepare: async (page) => { await page.waitForTimeout(1_200); },
      stillOnly: true,
      fullPage: true,
    });
  }

  // 9. Species profile, ecology snapshot (habitat slide of the carousel).
  await captureScene({
    name: "m09-species-pinetell",
    path: "/bolets/lactarius-deliciosus",
    ready: "main h1",
    prepare: async (page) => {
      const target = await page.locator(".ecology-snapshot").count() ? ".ecology-snapshot" : "main section:nth-of-type(2)";
      await scrollElementToTop(page, target, 24, 1_200);
      await page.waitForTimeout(900);
    },
    stillOnly: true,
  });
} finally {
  await browser.close();
}
