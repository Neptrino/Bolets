import { readFile, writeFile } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { createHash } from "node:crypto";
import { parseCliArguments } from "./lib/private-io.mjs";
import { temperatureMetrics, normalizeArchivedTemperature, type TemperaturePair } from "./lib/station-temperature-evaluation.ts";
import { createStationObservedTemperature, modelTemperatureAtElevation, blendStationModelTemperature,
  STATION_TEMPERATURE_CODES, STATION_DONOR_TAPER } from "../supabase/functions/_shared/station-temperature-field.ts";
import { modelIntervalMean, type StationTemperatureHour } from "../supabase/functions/_shared/xema-temperature.ts";
import type { XemaStation } from "../supabase/functions/_shared/xema-rain.ts";

// Offline, leave-one-station-out comparison at existing production model points.
// The target's measurements never contribute to either interpolated field.
const args = parseCliArguments();
const path = (key: string) => {
  const value = args.get(key); if (!value || value === "true") throw new Error(`--${key} is required`);
  return resolve(value);
};
const inputs: { file: string; sha256: string }[] = [];
async function readInput(file: string) {
  const text = await readFile(file, "utf8");
  inputs.push({ file: basename(file), sha256: createHash("sha256").update(text).digest("hex") });
  return JSON.parse(text);
}
const stations: XemaStation[] = await readInput(path("stations"));
const input = await readInput(path("model-controls"));
// Frozen original pilot archive requests are a supplemental eight-target check.
const archive = Array.isArray(input.payload);
const pilotStations = stations.filter((s) => (STATION_TEMPERATURE_CODES as readonly string[]).includes(s.station_code));
if (archive && (input.payload.length !== pilotStations.length || !input.url)) throw new Error("Invalid pilot archive envelope");
const controls = (archive ? {
  links: pilotStations.map((s) => ({ stationCode: s.station_code, pointId: s.station_code })),
  states: pilotStations.map((station, i) => {
    const model = normalizeArchivedTemperature(input.payload[i], station);
    return { point_id: station.station_code, payload: { ...model, hourly: {
      time: [...model.hours.keys()].map((h) => h / 1000), temperature_2m: [...model.hours.values()],
    } } };
  }),
} : input) as {
  links: { stationCode: string; pointId: string }[];
  states: { point_id: string; payload: { elevation: number; latitude: number; longitude: number;
    hourly: { time: number[]; temperature_2m: number[] } } }[];
};
const start = Date.parse(String(args.get("start"))), end = Date.parse(String(args.get("end"))) + 86_400_000;
if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 60 * 86_400_000) throw new Error("Invalid station test window");
const observations: StationTemperatureHour[] = [];
for (let day = start; day < end; day += 86_400_000) {
  const input = await readInput(resolve(path("hours-dir"), new Date(day).toISOString().slice(0, 10) + ".json"));
  observations.push(...input.hours);
}
const pilot = stations.filter((s) => (STATION_TEMPERATURE_CODES as readonly string[]).includes(s.station_code));
const fields = [pilot, stations].map((pool) => createStationObservedTemperature(observations, pool, 6.5, STATION_DONOR_TAPER));
const modelById = new Map(controls.states.map((s) => [s.point_id, s.payload]));
const pointByStation = new Map(controls.links.map((link) => [link.stationCode, link.pointId]));
const results = stations.map((station) => {
  const observed = observations.filter((h) => h.stationCode === station.station_code && h.hour >= start && h.hour < end);
  const model = modelById.get(pointByStation.get(station.station_code)!);
  if (!model || !Number.isFinite(model.elevation)) return { stationCode: station.station_code, observedHours: observed.length, unavailable: "no-stored-canonical-model-point" };
  if (model.hourly.time.length !== model.hourly.temperature_2m.length || new Set(model.hourly.time).size !== model.hourly.time.length) throw new Error("Invalid model controls");
  const hours = new Map(model.hourly.time.map((h, i) => [h * 1000, model.hourly.temperature_2m[i]]));
  const pairs: TemperaturePair[] = observed.flatMap((h) => {
    const modelC = modelIntervalMean(hours, h.hour);
    return modelC === undefined ? [] : [{ ...h, modelC }];
  });
  const at = fields.map((field) => field(station));
  const estimates = at.map((field) => pairs.map((p) => blendStationModelTemperature(
    modelTemperatureAtElevation(p.modelC, model.elevation, station.altitude_m), field(p.hour, false)?.temperatureC)));
  const complete = estimates.map((values) => values.filter((v) => v !== undefined).length);
  return { stationCode: station.station_code, altitudeM: station.altitude_m, modelElevationM: model.elevation,
    observedHours: observed.length, pairedHours: pairs.length,
    pilotSupportedHours: complete[0], networkSupportedHours: complete[1],
    baseline: temperatureMetrics(pairs),
    pilot: temperatureMetrics(pairs, estimates[0].map((v, i) => v ?? pairs[i].modelC)),
    network: temperatureMetrics(pairs, estimates[1].map((v, i) => v ?? pairs[i].modelC)),
  };
});
const active = results.filter((r) => r.pairedHours && r.baseline && r.pilot && r.network);
const summarize = (selected: typeof active) => {
  const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  return { stations: selected.length, pairedHours: selected.reduce((n, r) => n + r.pairedHours!, 0),
    pilotSupportedHours: selected.reduce((n, r) => n + r.pilotSupportedHours!, 0),
    networkSupportedHours: selected.reduce((n, r) => n + r.networkSupportedHours!, 0),
    metrics: Object.fromEntries((["baseline", "pilot", "network"] as const).map((kind) => [kind, {
      meanStationMaeC: mean(selected.map((r) => r[kind]!.maeC!)),
      heatErrors: selected.reduce((n, r) => n + r[kind]!.heatFalsePositiveHours + r[kind]!.heatFalseNegativeHours, 0),
      frostErrors: selected.reduce((n, r) => n + r[kind]!.frostFalsePositiveHours + r[kind]!.frostFalseNegativeHours, 0),
    }])) };
};
const report = { version: "xema-network-station-comparison-v1", createdAt: new Date().toISOString(),
  start: new Date(start).toISOString(), endExclusive: new Date(end).toISOString(),
  inputs, modelSource: archive ? "frozen-pilot-station-coordinate-archive" : "stored-canonical-production-points",
  stationMetadataCount: stations.length, reportingStations: results.filter((r) => r.observedHours > 0).length,
  summary: summarize(active), elevationBands: {
    below600m: summarize(active.filter((r) => r.altitudeM! < 600)),
    from600to1200m: summarize(active.filter((r) => r.altitudeM! >= 600 && r.altitudeM! < 1200)),
    above1200m: summarize(active.filter((r) => r.altitudeM! >= 1200)),
  }, stations: results, limitations: [
    "Every target station is omitted from both interpolation pools; same matched hours with raw model fallback",
    archive ? "Eight target stations from frozen station-coordinate archive requests; full network used only as donors" : "Uses existing production representative points in the canonical 2.5 km cell, not new model requests at station coordinates",
    "Fixed stated evaluation window; no claim of independent mushroom prediction validation",
    "Published provisional station observations included; interval means give threshold proxies, not measured exposure duration",
  ] };
await writeFile(path("out"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ reportingStations: report.reportingStations, summary: report.summary, elevationBands: report.elevationBands }, null, 2));
