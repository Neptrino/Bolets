import { parseCliArguments } from "./lib/private-io.mjs";
import {
  aemetDailyClimatologyPath,
  AEMET_STATION_INVENTORY_PATH,
  fetchAemetJson,
  normalizeAemetDailyRain,
  normalizeAemetStations,
} from "./lib/aemet-rain.mjs";
import {
  fetchXemaRows,
  haversineKm,
  interpolateStationRain,
  normalizeXemaStation,
  XEMA_INTERPOLATION,
  XEMA_MEASUREMENTS_DATASET,
  XEMA_RAIN_VARIABLE_CODE,
  XEMA_SOCRATA_ORIGIN,
  xemaStationsUrl,
  type StationRainSample,
  type XemaStation,
} from "../supabase/functions/_shared/xema-rain.ts";

// Validates observed station rain against the archived model rain the
// production pipeline stores, at one point over a date range. This is the
// evidence step for the station-correction shadow: it quantifies how much
// rain the pinned model misses (or invents) before any correction touches
// the unified water model. Coordinates are process arguments only and are
// never written to disk.

const MODEL_IDS = ["arome_france", "ecmwf_ifs", "meteofrance_seamless", "best_match"] as const;
const MAX_RANGE_DAYS = 120;
const AEMET_CHUNK_DAYS = 30;
// 48 half-hourly readings make a complete gauge day; below 40 an outage
// could hide real rain, so the station drops out of that day's field.
const MIN_HALF_HOURS_PER_DAY = 40;
const MAX_DAILY_MM = 500;
const STORM_MM = 5;
const DRY_MM = 1;

type DailyStationRain = Map<string, Map<string, { totalMm: number; halfHours: number }>>;

const argumentsByName = parseCliArguments();

function usage() {
  return [
    "Station-versus-model rain comparison",
    "",
    "Usage:",
    "  npm run weather:compare-station-rain -- \\",
    "    --lat=42.38287 --lon=2.33794 --start=2026-08-01 --end=2026-08-15",
    "",
    "Options:",
    `  --radius=${XEMA_INTERPOLATION.maxDistanceKm}   # station search radius in km`,
    "  --json       # machine-readable output",
    "",
    "Days are UTC. Models come from the Open-Meteo historical-forecast",
    "archive, the same past data the production pipeline stores. With",
    "AEMET_API_KEY set, AEMET daily gauges are added as an independent",
    "network (their climatological day runs 07:00 to 07:00 UTC).",
  ].join("\n");
}

if (argumentsByName.has("help")) {
  console.log(usage());
  process.exit(0);
}

function isoDate(name: string) {
  const value = argumentsByName.get(name);
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${usage()}\n\n--${name} must be an ISO date.`);
  }
  return value;
}

const latitude = Number(argumentsByName.get("lat"));
const longitude = Number(argumentsByName.get("lon"));
if (!(latitude >= 40.3 && latitude <= 43.0 && longitude >= -0.5 && longitude <= 3.5)) {
  throw new Error(`${usage()}\n\n--lat/--lon must fall inside the XEMA network's Catalonia bounds.`);
}
const startDate = isoDate("start");
const endDate = isoDate("end");
const radiusKm = Number(argumentsByName.get("radius") ?? XEMA_INTERPOLATION.maxDistanceKm);
if (!(radiusKm >= 5 && radiusKm <= 100)) throw new Error("--radius must be between 5 and 100 km");
const jsonOutput = argumentsByName.has("json");

const startMs = Date.parse(`${startDate}T00:00:00Z`);
const endMs = Date.parse(`${endDate}T00:00:00Z`);
const today = new Date().toISOString().slice(0, 10);
if (endMs < startMs) throw new Error("--end must not precede --start");
if (endDate >= today) throw new Error("--end must be a completed UTC day");
if ((endMs - startMs) / 86_400_000 + 1 > MAX_RANGE_DAYS) {
  throw new Error(`The range must stay within ${MAX_RANGE_DAYS} days`);
}

const days: string[] = [];
for (let at = startMs; at <= endMs; at += 86_400_000) {
  days.push(new Date(at).toISOString().slice(0, 10));
}

function log(message: string) {
  if (!jsonOutput) console.log(message);
}

// --- XEMA: stations near the target, then their semi-hourly rain ---

const stationRows = await fetchXemaRows(xemaStationsUrl(), "station metadata");
const nearbyStations = stationRows
  .map(normalizeXemaStation)
  .filter((station): station is XemaStation => station !== undefined)
  .filter((station) => haversineKm(latitude, longitude, station.latitude, station.longitude) <= radiusKm);
if (nearbyStations.length === 0) {
  throw new Error(`No XEMA stations within ${radiusKm} km; widen --radius or check the coordinates.`);
}
log(`XEMA stations within ${radiusKm} km: ${nearbyStations.length}`);

// Socrata aggregates daily totals and half-hour counts server-side. One
// single-day grouped query answers in well under a second, while multi-day
// grouped or raw-row queries take anywhere from seconds to several minutes
// on the provider, so the range runs as one bounded query per day.
function xemaDayTotalsUrl(day: string) {
  const codes = nearbyStations.map((station) => `'${station.station_code}'`).join(",");
  const nextDay = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const url = new URL(`${XEMA_SOCRATA_ORIGIN}/resource/${XEMA_MEASUREMENTS_DATASET}.json`);
  url.searchParams.set("$select", "codi_estacio,sum(valor_lectura) as total_mm,count(valor_lectura) as half_hours");
  url.searchParams.set(
    "$where",
    `codi_variable='${XEMA_RAIN_VARIABLE_CODE}' AND codi_estacio in(${codes})` +
      ` AND data_lectura >= '${day}T00:00:00' AND data_lectura < '${nextDay}T00:00:00'`,
  );
  url.searchParams.set("$group", "codi_estacio");
  url.searchParams.set("$limit", "1000");
  return url;
}

const XEMA_CONCURRENT_DAYS = 4;
const dailyStationRain: DailyStationRain = new Map();
for (let offset = 0; offset < days.length; offset += XEMA_CONCURRENT_DAYS) {
  const batch = days.slice(offset, offset + XEMA_CONCURRENT_DAYS);
  const results = await Promise.all(batch.map(async (day) => ({
    day,
    rows: await fetchXemaRows(xemaDayTotalsUrl(day), `daily totals for ${day}`),
  })));
  for (const { day, rows } of results) {
    for (const row of rows) {
      const entry = row as Record<string, unknown>;
      const code = typeof entry.codi_estacio === "string" ? entry.codi_estacio.toUpperCase() : "";
      const totalMm = Number(entry.total_mm);
      const halfHours = Number(entry.half_hours);
      if (!code || !Number.isFinite(totalMm) || totalMm < 0 || totalMm > MAX_DAILY_MM) continue;
      if (!Number.isInteger(halfHours) || halfHours < 1 || halfHours > 48) continue;
      const perStation = dailyStationRain.get(day) ?? new Map();
      perStation.set(code, { totalMm, halfHours });
      dailyStationRain.set(day, perStation);
    }
  }
  log(`  gauge days fetched: ${Math.min(offset + XEMA_CONCURRENT_DAYS, days.length)}/${days.length}`);
}

const stationsByCode = new Map(nearbyStations.map((station) => [station.station_code, station]));
type DayField = { interpolation: ReturnType<typeof interpolateStationRain>; completeStations: number };
const xemaByDay = new Map<string, DayField>();
for (const day of days) {
  const perStation = dailyStationRain.get(day) ?? new Map();
  const samples: StationRainSample[] = [];
  for (const [code, entry] of perStation) {
    const station = stationsByCode.get(code);
    if (!station || entry.halfHours < MIN_HALF_HOURS_PER_DAY) continue;
    samples.push({
      station_code: code,
      latitude: station.latitude,
      longitude: station.longitude,
      precipitation_mm: Math.round(entry.totalMm * 10) / 10,
    });
  }
  xemaByDay.set(day, {
    interpolation: interpolateStationRain(latitude, longitude, samples, { maxDistanceKm: radiusKm }),
    completeStations: samples.length,
  });
}

// --- Models: the archived past the production pipeline would have stored ---

// One request covers every model; per-model keys come back suffixed. The
// free tier enforces a per-IP concurrency guard whose cool-down outlasts a
// quick retry, so 429s and transient errors back off patiently instead of
// failing a whole sweep.
async function fetchModelArchive() {
  const url = new URL("https://historical-forecast-api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("daily", "precipitation_sum");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("models", MODEL_IDS.join(","));
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Bolets-Atles/1.0" },
        signal: AbortSignal.timeout(60_000),
      });
      const payload = await response.json().catch(() => undefined) as
        | { error?: boolean; reason?: string; daily?: Record<string, unknown> }
        | undefined;
      if (response.ok && payload?.daily) return payload.daily;
      const reason = payload?.reason ?? `status ${response.status}`;
      if (attempt === 6) throw new Error(`Open-Meteo archive request failed: ${reason}`);
      log(`  model archive busy (${reason}); retrying in ${attempt * 30}s`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Open-Meteo")) throw error;
      if (attempt === 6) throw new Error("Open-Meteo archive request failed after retries");
      log(`  model archive transport error; retrying in ${attempt * 30}s`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 30_000));
  }
  throw new Error("Open-Meteo archive request failed");
}

const modelByDay = new Map<string, Map<string, number | undefined>>(days.map((day) => [day, new Map()]));
{
  const daily = await fetchModelArchive();
  const times = Array.isArray(daily.time) ? daily.time as string[] : [];
  for (const model of MODEL_IDS) {
    // Multi-model responses suffix each variable; a single-model response
    // keeps the plain name.
    const series = (daily[`precipitation_sum_${model}`] ?? daily.precipitation_sum) as (number | null)[] | undefined;
    times.forEach((day, index) => {
      const value = series?.[index];
      modelByDay.get(day)?.set(model, typeof value === "number" && Number.isFinite(value) ? value : undefined);
    });
  }
}

// --- AEMET (optional): an independent gauge network as cross-validation ---

const aemetKey = process.env.AEMET_API_KEY;
const aemetByDay = new Map<string, number>();
let aemetStationCount = 0;
if (aemetKey) {
  const inventory = normalizeAemetStations(await fetchAemetJson(AEMET_STATION_INVENTORY_PATH, aemetKey));
  const aemetNearby = inventory.filter((station) =>
    haversineKm(latitude, longitude, station.latitude, station.longitude) <= radiusKm
  );
  aemetStationCount = aemetNearby.length;
  const aemetStations = new Map(aemetNearby.map((station) => [station.stationId, station]));
  if (aemetNearby.length > 0) {
    for (let chunkStartMs = startMs; chunkStartMs <= endMs; chunkStartMs += AEMET_CHUNK_DAYS * 86_400_000) {
      const chunkEndMs = Math.min(chunkStartMs + (AEMET_CHUNK_DAYS - 1) * 86_400_000, endMs);
      const rows = await fetchAemetJson(
        aemetDailyClimatologyPath(
          new Date(chunkStartMs).toISOString().slice(0, 10),
          new Date(chunkEndMs).toISOString().slice(0, 10),
        ),
        aemetKey,
      );
      const perDay = new Map<string, StationRainSample[]>();
      for (const reading of normalizeAemetDailyRain(rows)) {
        const station = aemetStations.get(reading.stationId);
        if (!station) continue;
        const samples = perDay.get(reading.date) ?? [];
        samples.push({
          station_code: reading.stationId,
          latitude: station.latitude,
          longitude: station.longitude,
          precipitation_mm: reading.precipitationMm,
        });
        perDay.set(reading.date, samples);
      }
      for (const [day, samples] of perDay) {
        const interpolated = interpolateStationRain(latitude, longitude, samples, {
          maxDistanceKm: radiusKm,
          minStations: 1,
        });
        if (interpolated) aemetByDay.set(day, interpolated.precipitation_mm);
      }
    }
  }
  log(`AEMET stations within ${radiusKm} km: ${aemetStationCount} (climatological day 07:00Z to 07:00Z)`);
} else {
  log("AEMET_API_KEY not set; skipping the independent AEMET cross-check.");
}

// --- Report ---

type DayReport = {
  date: string;
  xemaMm: number | undefined;
  stationsUsed: number;
  nearestStationKm: number | undefined;
  models: Record<string, number | undefined>;
  aemetMm: number | undefined;
};

const report: DayReport[] = days.map((day) => {
  const field = xemaByDay.get(day);
  return {
    date: day,
    xemaMm: field?.interpolation?.precipitation_mm,
    stationsUsed: field?.interpolation?.stations_used ?? 0,
    nearestStationKm: field?.interpolation?.nearest_station_km,
    models: Object.fromEntries(MODEL_IDS.map((model) => [model, modelByDay.get(day)?.get(model)])),
    aemetMm: aemetByDay.get(day),
  };
});

const scored = report.filter((day) => day.xemaMm !== undefined);
const summary = MODEL_IDS.map((model) => {
  const paired = scored.filter((day) => day.models[model] !== undefined);
  const observedTotal = paired.reduce((total, day) => total + (day.xemaMm ?? 0), 0);
  const modelTotal = paired.reduce((total, day) => total + (day.models[model] ?? 0), 0);
  const meanAbsoluteError = paired.length
    ? paired.reduce((total, day) => total + Math.abs((day.models[model] ?? 0) - (day.xemaMm ?? 0)), 0) / paired.length
    : undefined;
  const missedStorms = paired.filter((day) => (day.xemaMm ?? 0) >= STORM_MM && (day.models[model] ?? 0) < DRY_MM).length;
  const phantomStorms = paired.filter((day) => (day.models[model] ?? 0) >= STORM_MM && (day.xemaMm ?? 0) < DRY_MM).length;
  return {
    model,
    days: paired.length,
    observedTotalMm: Math.round(observedTotal * 10) / 10,
    modelTotalMm: Math.round(modelTotal * 10) / 10,
    meanAbsoluteErrorMm: meanAbsoluteError === undefined ? undefined : Math.round(meanAbsoluteError * 100) / 100,
    missedStorms,
    phantomStorms,
  };
});

if (jsonOutput) {
  console.log(JSON.stringify({
    latitude,
    longitude,
    startDate,
    endDate,
    radiusKm,
    xemaStationsNearby: nearbyStations.length,
    aemetStationsNearby: aemetStationCount,
    days: report,
    summary,
  }, null, 2));
} else {
  const width = 12;
  const header = ["date", "xema", "stn", ...MODEL_IDS, aemetKey ? "aemet" : ""].filter(Boolean);
  console.log("\n" + header.map((label) => label.padEnd(width)).join(""));
  for (const day of report) {
    const cells = [
      day.date,
      day.xemaMm === undefined ? "-" : day.xemaMm.toFixed(1),
      String(day.stationsUsed),
      ...MODEL_IDS.map((model) => {
        const value = day.models[model];
        return value === undefined ? "-" : value.toFixed(1);
      }),
      ...(aemetKey ? [day.aemetMm === undefined ? "-" : day.aemetMm.toFixed(1)] : []),
    ];
    console.log(cells.map((cell) => cell.padEnd(width)).join(""));
  }
  console.log("\nSummary against interpolated XEMA gauges (UTC days, mm):");
  for (const entry of summary) {
    console.log(
      `  ${entry.model.padEnd(22)} total ${String(entry.modelTotalMm).padStart(7)} vs observed ${String(entry.observedTotalMm).padStart(7)}` +
        `  MAE/day ${String(entry.meanAbsoluteErrorMm ?? "-").padStart(6)}  missed storms ${entry.missedStorms}  phantom storms ${entry.phantomStorms}`,
    );
  }
  console.log(
    `\nDays without a usable gauge field: ${report.length - scored.length}` +
      ` (needs ${XEMA_INTERPOLATION.minStations}+ complete stations within ${radiusKm} km).`,
  );
}
