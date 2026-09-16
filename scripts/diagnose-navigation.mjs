/** Read-only synthetic navigation probe. Never attaches to a user's browser. */
import { chromium, firefox } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const paths = ["/", "/guies", "/map"];
const output = resolve("artifacts/navigation-diagnostic.json");
const report = {
  capturedAt: new Date().toISOString(),
  platform: process.platform,
  note: "Synthetic unthrottled local runs, not Windows field evidence. DNT enabled. No HAR, cookies, query strings or user identifiers saved. Timing phases can be zero for reused connections or unavailable browser fields.",
  samples: [],
};

for (const [engine, browserType] of Object.entries({ firefox, chromium })) {
  const browser = await browserType.launch({ headless: true });
  try {
    // Separate browser contexts for each path/trial; returning sample shares only
    // its immediately preceding first visit, including any installed worker.
    for (let trial = 1; trial <= 2; trial++) {
      for (const path of paths) {
        const context = await browser.newContext({
          extraHTTPHeaders: { DNT: "1" },
          viewport: { width: 1365, height: 900 },
        });
        try {
          await context.addInitScript(() => {
            Object.defineProperty(navigator, "doNotTrack", { get: () => "1" });
          });
          const page = await context.newPage();
          for (const visit of ["first", "returning"]) {
            const sample = { engine, version: browser.version(), trial, path, visit };
            try {
              if (visit === "returning") {
                // Let normal hydration/install finish before testing the offline
                // worker path. Never manually register or replace the worker.
                sample.workerReadyBeforeVisit = await page.waitForFunction(
                  () => !!navigator.serviceWorker?.controller,
                  undefined, { timeout: 15_000 },
                ).then(() => true, () => false);
              }
              const response = await page.goto(`https://bolets.app${path}`, {
                waitUntil: "load", timeout: 60_000,
              });
              Object.assign(sample, {
                status: response?.status(),
                timings: await page.evaluate(() => {
                  const n = performance.getEntriesByType("navigation")[0];
                  if (!n) return null;
                  const ms = (value) => Math.round(value * 10) / 10;
                  return {
                    ttfbMs: ms(n.responseStart - n.startTime),
                    preFetchMs: ms(n.fetchStart - n.startTime),
                    dnsMs: ms(n.domainLookupEnd - n.domainLookupStart),
                    connectionMs: ms(n.connectEnd - n.connectStart),
                    tlsMs: n.secureConnectionStart > 0
                      ? ms(n.connectEnd - n.secureConnectionStart) : null,
                    requestToFirstByteMs: ms(n.responseStart - n.requestStart),
                    downloadMs: ms(n.responseEnd - n.responseStart),
                    domContentLoadedMs: ms(n.domContentLoadedEventEnd - n.startTime),
                    protocol: n.nextHopProtocol,
                    serviceWorkerControlled: !!navigator.serviceWorker?.controller,
                    workerStartMs: ms(n.workerStart),
                  };
                }),
              });
            } catch (error) {
              // Only retain a fixed error category, never raw browser log text.
              sample.error = error.name === "TimeoutError" ? "navigation-timeout" : "navigation-failed";
              process.exitCode = 1;
            }
            report.samples.push(sample);
            console.log(JSON.stringify(sample));
          }
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  }
}
console.log(`Saved ${output}`);
