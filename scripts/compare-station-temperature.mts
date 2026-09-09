import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseCliArguments } from "./lib/private-io.mjs";
import { providerAccountingConfig } from "./lib/provider-accounting.ts";
import { evaluateStationBias, normalizeArchivedTemperature, temperatureMetrics, type TemperaturePair } from "./lib/station-temperature-evaluation.ts";
import { evaluateStationInterpolation } from "./lib/station-temperature-interpolation.ts";
import { evaluateStationModelBlend } from "./lib/station-temperature-blend.ts";
import { fetchXemaRows, normalizeXemaStation, xemaStationsUrl } from "../supabase/functions/_shared/xema-rain.ts";
import { aggregateXemaTemperatureHours, modelIntervalMean, xemaTemperatureDayUrl, type TemperatureQuality } from "../supabase/functions/_shared/xema-temperature.ts";
import { estimateOpenMeteoRequestUnits, recordOpenMeteoUsage } from "../supabase/functions/_shared/provider-budget.ts";

const args = parseCliArguments();
if (args.has("help")) {
  console.log(`Offline XEMA temperature / archived AROME diagnostic

  npm run weather:compare-station-temperature -- --stations=DG,ZC,ZD,DP,CG,YA,MS,W9 \\
    --start=2026-08-20 --end=2026-09-08 --split=2026-08-30 --quality=published

Options:
  --quality=validated   Require V flags (default); published includes labelled provisional readings.
  --cache-dir=...       Default artifacts/station-temperature/cache; public station data only.
  --out=...             Default artifacts/station-temperature/report.json.
  --station-lag-hours=0..12  Also simulate unavailable trailing peer observations.
  --offline            Require cached inputs; never call providers or the usage ledger.

End is inclusive and must be a completed UTC day; range 10–60 days, 3–40 stations.
All candidates exclude the target station. Residual corrections use earlier
hour-of-day biases or same-hour peers. Direct observation interpolation tests
fixed 6.5 C/km and zero lapse, with supported-hour comparisons reported separately.
An additional fixed 50/50 station/model blend first aligns both to target elevation.
All evaluate dates after --split. No weather snapshots or prediction scores change.
Uncached AROME requests use the hosted spatial owner's credentials for shared
usage accounting, or hosted SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY when no
spatial override is configured. Credentials may be loaded from .env.local.`);
  process.exit(0);
}

const date = (name: string) => {
  const value = args.get(name);
  const ms = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) : NaN;
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) throw new Error(`--${name} must be an ISO calendar date`);
  return { value: value as string, ms };
};
const start = date("start");
const end = date("end");
const split = date("split");
const lagHours = args.has("station-lag-hours") ? Number(args.get("station-lag-hours")) : undefined;
if (lagHours !== undefined && (!Number.isInteger(lagHours) || lagHours < 0 || lagHours > 12)) throw new Error("Invalid station delay");
const days = (end.ms - start.ms) / 86_400_000 + 1;
if (days < 10 || days > 60 || end.value >= new Date().toISOString().slice(0, 10)) {
  throw new Error("Choose 10–60 completed UTC days");
}
if (split.ms < start.ms + 5 * 86_400_000 || split.ms > end.ms - 4 * 86_400_000) {
  throw new Error("Reserve at least five days on each side of --split");
}
const codes = [...new Set(String(args.get("stations") ?? "").split(","))].sort();
if (codes.length < 3 || codes.length > 40 || codes.some((code) => !/^[A-Z0-9]{1,4}$/.test(code))) {
  throw new Error("--stations must list 3–40 distinct XEMA station codes");
}
const quality = (args.get("quality") ?? "validated") as TemperatureQuality;
if (!["validated", "published"].includes(quality)) throw new Error("--quality must be validated or published");
const cacheDir = resolve(String(args.get("cache-dir") ?? "artifacts/station-temperature/cache"));
const out = resolve(String(args.get("out") ?? "artifacts/station-temperature/report.json"));
const offline = args.has("offline");
await mkdir(cacheDir, { recursive: true });
const usage = { cacheHits: 0, xemaRequests: 0, openMeteoRequests: 0, estimatedProviderUnits: 0 };
const inputs: { urlSha256: string; payloadSha256: string; fetchedAt: string }[] = [];
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const recordInput = (url: URL, payload: unknown, fetchedAt: string) => {
  inputs.push({ urlSha256: hash(url.href), payloadSha256: hash(JSON.stringify(payload)), fetchedAt });
};

async function cached<T>(url: URL, loader: () => Promise<T>): Promise<T> {
  const path = resolve(cacheDir, createHash("sha256").update(url.href).digest("hex") + ".json");
  try {
    const entry = JSON.parse(await readFile(path, "utf8"));
    if (entry.url !== url.href || entry.version !== 1) throw new Error("Cache provenance mismatch");
    usage.cacheHits++;
    recordInput(url, entry.payload, entry.fetchedAt);
    return entry.payload;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    if (offline) throw new Error(`Offline cache miss for ${url.hostname}`);
  }
  const payload = await loader();
  const fetchedAt = new Date().toISOString();
  await writeFile(path, JSON.stringify({ version: 1, url: url.href, fetchedAt, payload }));
  recordInput(url, payload, fetchedAt);
  return payload;
}

const stationUrl = xemaStationsUrl();
const metadata = await cached(stationUrl, () => {
  usage.xemaRequests++;
  return fetchXemaRows(stationUrl, "temperature station metadata");
});
const stations = metadata.map(normalizeXemaStation).filter((station) => station !== undefined && codes.includes(station.station_code));
if (stations.length !== codes.length) throw new Error("Some requested stations lack valid XEMA metadata");
stations.sort((a, b) => a.station_code.localeCompare(b.station_code));
const rows: unknown[] = [];
for (let offset = 0; offset < days; offset += 4) {
  const batch = Array.from({ length: Math.min(4, days - offset) }, (_, index) =>
    new Date(start.ms + (offset + index) * 86_400_000).toISOString().slice(0, 10));
  const results = await Promise.allSettled(batch.map(async (day) => {
    const url = xemaTemperatureDayUrl(day, codes);
    return cached(url, async () => {
      usage.xemaRequests++;
      const values = await fetchXemaRows(url, `temperature ${day}`);
      if (values.length >= 10000) throw new Error("XEMA temperature response may be truncated");
      return values;
    });
  }));
  for (const result of results) {
    if (result.status === "rejected") throw result.reason;
    rows.push(...result.value);
  }
  console.log(`Station days ready: ${Math.min(offset + 4, days)}/${days}`);
}
const normalized = aggregateXemaTemperatureHours(rows, quality);
if (normalized.hours.length === 0) {
  throw new Error(`No complete station hours under ${quality} policy; flags: ${JSON.stringify(normalized.qualityCounts)}. Published readings must be explicitly requested for a provisional diagnostic.`);
}

const modelUrl = new URL("https://historical-forecast-api.open-meteo.com/v1/forecast");
modelUrl.searchParams.set("latitude", stations.map((station) => station.latitude).join(","));
modelUrl.searchParams.set("longitude", stations.map((station) => station.longitude).join(","));
modelUrl.searchParams.set("start_date", start.value);
// One following endpoint is necessary for the final complete interval mean.
modelUrl.searchParams.set("end_date", new Date(end.ms + 86_400_000).toISOString().slice(0, 10));
modelUrl.searchParams.set("hourly", "temperature_2m");
modelUrl.searchParams.set("models", "arome_france");
modelUrl.searchParams.set("timezone", "UTC");
const payload = await cached<unknown[]>(modelUrl, async () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try { process.loadEnvFile(".env.local"); } catch { /* Validated below; never expose credentials. */ }
  }
  const { url, key } = providerAccountingConfig(process.env);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const units = estimateOpenMeteoRequestUnits(modelUrl, stations.length);
  await recordOpenMeteoUsage(supabase, "station-temperature-diagnostic", units);
  usage.estimatedProviderUnits += units;
  usage.openMeteoRequests++;
  const response = await fetch(modelUrl, { signal: AbortSignal.timeout(60_000), headers: { "User-Agent": "Bolets-Atles/1.0" } });
  // A diagnostic never changes egress or retries a blocked provider.
  if (!response.ok) throw new Error(`AROME archive returned ${response.status}; stopped without retry`);
  const result = await response.json();
  if (!Array.isArray(result) || result.length !== stations.length) throw new Error("AROME location count mismatch");
  return result;
});
if (!Array.isArray(payload) || payload.length !== stations.length) throw new Error("Cached AROME location count mismatch");
const pairs: TemperaturePair[] = [];
const stationResults = stations.map((station, index) => {
  const location = normalizeArchivedTemperature(payload[index], station);
  const observations = normalized.hours.filter((hour) => hour.stationCode === station.station_code && hour.hour >= start.ms && hour.hour < end.ms + 86_400_000);
  const matched = observations.flatMap((hour) => {
    const modelC = modelIntervalMean(location.hours, hour.hour);
    return modelC === undefined ? [] : [{ ...hour, modelC }];
  });
  pairs.push(...matched);
  return {
    ...station,
    providerLatitude: location.latitude, providerLongitude: location.longitude, providerElevationM: location.elevation,
    expectedHours: days * 24, completeObservedHours: observations.length,
    completeComparisonWindow: matched.length === days * 24,
    ...temperatureMetrics(matched),
  };
});
if (pairs.length === 0) throw new Error("No aligned station/model temperature hours");
const report = {
  version: "station-temperature-diagnostic-v1",
  createdAt: new Date().toISOString(),
  start: start.value, endInclusive: end.value, quality,
  sources: {
    observations: "XEMA variable 32, SH/HO interval means, UTC interval starts; validation flags preserved",
    model: "Open-Meteo archived arome_france temperature_2m at station coordinates, default provider DEM downscaling; no additional lapse correction",
    alignment: "Complete XEMA hour vs trapezoidal model interval mean. Heat ≥27°C and frost ≤0°C count hourly-mean threshold proxies, not measured duration or production instantaneous counts.",
  },
  qualityCounts: normalized.qualityCounts, conflictingReadings: normalized.conflictingReadings,
  stations: stationResults,
  baseline: temperatureMetrics(pairs),
  experiment: evaluateStationBias(pairs, stations, split.ms),
  contemporaneousExperiment: evaluateStationBias(pairs, stations, split.ms, "contemporaneous"),
  observedInterpolation: {
    elevationAdjusted: evaluateStationInterpolation(pairs, normalized.hours, stations, split.ms, 6.5),
    noLapse: evaluateStationInterpolation(pairs, normalized.hours, stations, split.ms, 0),
  },
  stationModelBlend: evaluateStationModelBlend(pairs, normalized.hours, stations,
    new Map(stationResults.map((station) => [station.station_code, station.providerElevationM])), split.ms),
  taperedStationModelBlend: evaluateStationModelBlend(pairs, normalized.hours, stations,
    new Map(stationResults.map((station) => [station.station_code, station.providerElevationM])), split.ms, "tapered"),
  lagSensitivity: lagHours === undefined ? undefined : {
    trailingHours: lagHours,
    ...evaluateStationModelBlend(pairs, normalized.hours.filter((h) => h.hour < end.ms + 86_400_000 - lagHours * 3_600_000), stations,
      new Map(stationResults.map((station) => [station.station_code, station.providerElevationM])), split.ms, "tapered"),
  },
  usage,
  inputs: inputs.sort((a, b) => a.urlSha256.localeCompare(b.urlSha256)),
  limitations: [
    "Provisional observations are exploratory evidence when quality=published; not provider-final-validated ground truth.",
    "Counts use exactly matched available hours; incomplete windows are not extrapolated to 14/20 days.",
    "This samples stations, not the production representative points or the screenshot's neighbouring cells.",
    "The experiment has no production effect and does not establish fine-cell continuity or improved findings discrimination.",
  ],
};
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ report: out, qualityCounts: report.qualityCounts, baseline: report.baseline,
  experiment: report.experiment.summary, contemporaneousExperiment: report.contemporaneousExperiment.summary,
  observedInterpolation: Object.fromEntries(Object.entries(report.observedInterpolation).map(([key, value]) => [key, value.summary])),
  stationModelBlend: report.stationModelBlend.summary,
  taperedStationModelBlend: report.taperedStationModelBlend.summary, usage }, null, 2));
