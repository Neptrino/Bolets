import { createStationTemperatureScorer } from "@/supabase/functions/_shared/station-temperature-scoring";
import { STATION_TEMPERATURE_VERSION } from "@/supabase/functions/_shared/station-temperature-field";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { getSpecies } from "@/data/species";
import { countBasedSpecies } from "@/scripts/lib/heat-drying-candidates";
import type { ConditionSnapshot } from "@/src/lib/types";
import { calculateSuitability } from "@/src/lib/scoring";
import { rawDiagnostics } from "@/tests/helpers/finding-replay-scoring";
import { aggregateXemaTemperatureHours, xemaTemperatureDayUrl, type TemperatureQuality } from "@/supabase/functions/_shared/xema-temperature";
import type { XemaStation } from "@/supabase/functions/_shared/xema-rain";
import { compareCellTemperature, compareCellObservedTemperature, intervalBiasAtInstant, type ThermalControl } from "@/scripts/lib/cell-temperature-impact";
import { createStationObservedTemperature } from "@/scripts/lib/station-temperature-interpolation";
import { blendStationModelTemperature, modelTemperatureAtElevation, stationModelBlendConfig } from "@/scripts/lib/station-temperature-blend";

const enabled = Boolean(process.env.FINDING_BLEND_INPUTS);
beforeAll(() => { if (enabled) vi.stubGlobal("fetch", async () => { throw new Error("Finding temperature blend replay must remain offline"); }); });
afterAll(() => { if (enabled) vi.unstubAllGlobals(); });

it.skipIf(!enabled)("scores the fixed temperature blend against frozen findings with exact baseline controls", () => {
  const directory = process.env.FINDING_BLEND_INPUTS!;
  const out = process.env.FINDING_BLEND_OUTPUT!;
  const cache = process.env.FINDING_BLEND_CACHE!;
  const manifest = JSON.parse(readFileSync(process.env.FINDING_BLEND_MANIFEST!, "utf8")) as {
    plannedOnly: boolean; stations: XemaStation[]; days: string[];
    inputs: { urlSha256: string; payloadSha256: string }[];
    normalizedDays?: { day: string; sha256: string }[];
  };
  if (manifest.plannedOnly) throw new Error("Station manifest contains only a plan");
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const codes = manifest.stations.map((station) => station.station_code).sort();
  const quality = (process.env.FINDING_BLEND_QUALITY ?? "published") as TemperatureQuality;
  if (!["published", "validated"].includes(quality)) throw new Error("Invalid station quality policy");
  const normalized = { hours: [] as ReturnType<typeof aggregateXemaTemperatureHours>["hours"] };
  if (manifest.normalizedDays) {
    expect(manifest.normalizedDays.map((entry) => entry.day).sort()).toEqual([...manifest.days].sort());
    for (const entry of manifest.normalizedDays) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.day)) throw new Error("Invalid normalized station day");
      const encoded = readFileSync(join(cache, entry.day + ".json"), "utf8");
      if (hash(encoded) !== entry.sha256) throw new Error("Frozen normalized station input changed");
      const day = JSON.parse(encoded);
      normalized.hours.push(...day.hours.filter((hour: { validation: string }) => quality === "published" || hour.validation === "validated"));
    }
  } else {
    const stationRows: unknown[] = [];
    for (const day of manifest.days) {
      const url = xemaTemperatureDayUrl(day, codes);
      const entry = JSON.parse(readFileSync(join(cache, hash(url.href) + ".json"), "utf8"));
      const provenance = manifest.inputs.find((input) => input.urlSha256 === hash(url.href));
      if (entry.url !== url.href || !provenance || provenance.payloadSha256 !== hash(JSON.stringify(entry.payload))) throw new Error("Frozen station input changed");
      stationRows.push(...entry.payload);
    }
    normalized.hours = aggregateXemaTemperatureHours(stationRows, quality).hours;
  }
  const config = stationModelBlendConfig(process.env.FINDING_BLEND_MODE ?? "original");
  const lagSetting = process.env.FINDING_BLEND_LAG;
  const lag = lagSetting === undefined || lagSetting === "" ? undefined : Number(lagSetting);
  if (lag !== undefined && (!Number.isInteger(lag) || lag < 0 || lag > 13 || !config.donorTaper)) throw new Error("Invalid production lag scenario");
  const field = createStationObservedTemperature(normalized.hours, manifest.stations, config.lapseCPerKm, config.donorTaper);
  const sources = new Map<string, ThermalControl>();
  const inputs = readFileSync(join(directory, "inputs.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
  mkdirSync(out, { recursive: true, mode: 0o700 });
  const recordsFile = join(out, "evaluation-records.jsonl");
  writeFileSync(recordsFile, "", { mode: 0o600 });
  const coverage: Record<string, number> = {};
  let applied = 0;
  for (const input of inputs) {
    if (!/^[a-f0-9]{64}$/.test(input.sourceId)) throw new Error("Invalid private thermal source id");
    let source = sources.get(input.sourceId);
    if (!source) {
      const encoded = readFileSync(join(directory, "sources", input.sourceId + ".json"), "utf8");
      if (hash(encoded) !== input.sourceId) throw new Error("Frozen model source changed");
      const raw = JSON.parse(encoded) as { latitude: number; longitude: number; elevation: number; hourly: { time: number[]; temperature_2m: number[] } };
      expect(raw.hourly.time.length).toBe(raw.hourly.temperature_2m.length);
      expect(new Set(raw.hourly.time).size).toBe(raw.hourly.time.length);
      source = { latitude: raw.latitude, longitude: raw.longitude, elevationM: raw.elevation,
        hours: new Map(raw.hourly.time.map((second, i) => [second * 1000, raw.hourly.temperature_2m[i]])) };
      sources.set(input.sourceId, source);
    }
    const originalSnapshot = input.snapshot as ConditionSnapshot;
    // The legacy finding scorer retains elevation but omits grid coordinates.
    // Verify against the separately frozen canonical-cell assignment first.
    expect(source.latitude).toBeCloseTo(input.representative.latitude, 4);
    expect(source.longitude).toBeCloseTo(input.representative.longitude, 4);
    expect(source.elevationM).toBeCloseTo(input.representative.elevationM, 2);
    const snapshot: ConditionSnapshot = { ...originalSnapshot, values: { ...originalSnapshot.values,
      weatherGridLatitude: input.representative.latitude, weatherGridLongitude: input.representative.longitude } };
    const species = countBasedSpecies(getSpecies(input.record.speciesId)!);
    if (input.record.scoringModel !== "v2" || species.modelConfig.version !== input.record.modelVersion) throw new Error("Frozen scoring model changed");
    const control = compareCellTemperature(species, snapshot, source, () => 0);
    expect(control.baseline.score).toBe(input.record.opportunityIndex);
    expect(control.baseline.conditions).toBe(input.record.fruitingConditionsScore);
    if (control.status !== "available") {
      const reason = `control:${control.reason}`;
      coverage[reason] = (coverage[reason] ?? 0) + 1;
      appendFileSync(recordsFile, JSON.stringify({ ...input.record, temperatureBlend: {
        version: lag === undefined ? config.version : STATION_TEMPERATURE_VERSION, applied: false, reason, supportedHours: 0, totalHours: 480,
      } }) + "\n");
      continue;
    }
    expect(control.scenario).toEqual(control.baseline);
    const at = field({ station_code: "finding-cell", ...input.centre, altitude_m: snapshot.values.altitudeM });
    const series = new Map<number, number | undefined>();
    const end = Date.parse(snapshot.values.weatherObservedAt!);
    for (let i = 0; i < 480; i++) {
      const instant = end - i * 3_600_000;
      series.set(instant, blendStationModelTemperature(
        modelTemperatureAtElevation(source.hours.get(instant), source.elevationM, snapshot.values.altitudeM!),
        intervalBiasAtInstant((hour) => at(hour)?.temperatureC, instant)));
    }
    const comparison = compareCellObservedTemperature(species, snapshot, source, (instant) => series.get(instant));
    let productionValues: ConditionSnapshot["values"] | undefined;
    if (config.donorTaper) {
      const production = createStationTemperatureScorer(new Map([[input.sourceId, {
        version: STATION_TEMPERATURE_VERSION, endAt: end, latitude: source.latitude, longitude: source.longitude,
        elevationM: source.elevationM, stationWindowId: "stations",
        temperaturesC: Array.from({ length: 480 }, (_, i) => source.hours.get(end - (479 - i) * 3_600_000)!),
      }]]), new Map([["stations", { version: STATION_TEMPERATURE_VERSION, endAt: end, stations: manifest.stations,
        hours: normalized.hours.filter((h) => h.hour >= end - 480 * 3_600_000 && h.hour <= end - (lag ?? 0) * 3_600_000),
      }]]));
      const values = production({ ...snapshot.values, thermalSources: [{ id: input.sourceId }] }, input.centre.latitude, input.centre.longitude);
      const actual = calculateSuitability(species, { ...snapshot, values });
      const expected = comparison.status === "available" ? comparison.scenario : comparison.baseline;
      if (lag === undefined) {
        expect(actual.opportunityIndex).toBe(expected.score);
        expect(actual.fruitingConditionsScore).toBe(expected.conditions);
      }
      productionValues = values;
    }
    const available = lag === undefined ? comparison.status === "available" : productionValues?.temperatureSource === STATION_TEMPERATURE_VERSION;
    const reason = available ? "applied" : comparison.status === "available" ? "baseline-fallback" : comparison.reason;
    coverage[reason] = (coverage[reason] ?? 0) + 1;
    let record = { ...input.record };
    if (available) {
      applied++;
      const scenario: ConditionSnapshot = { ...snapshot, values: lag !== undefined ? productionValues! :
        { ...snapshot.values, ...(comparison.status === "available" ? comparison.corrected : {}), weatherElevationM: snapshot.values.altitudeM } };
      delete scenario.values.thermalExposure;
      const score = calculateSuitability(species, scenario);
      const raw = rawDiagnostics(species, scenario.observedAt, scenario.values);
      for (const key of ["water", "waterDetails", "effectiveHabitat", "phenology", "habitatFactor"]) {
        expect(raw[key as keyof typeof raw]).toEqual(input.record.raw[key]);
      }
      record = { ...record, opportunityIndex: score.opportunityIndex, fruitingConditionsScore: score.fruitingConditionsScore, raw,
        windowMeanTemperatureC: species.modelConfig.status === "supported" && species.modelConfig.temperature.windowDays === 14
          ? scenario.values.temperatureAvg14dC : scenario.values.temperatureAvg20dC };
    }
    record.temperatureBlend = { version: lag === undefined ? config.version : STATION_TEMPERATURE_VERSION, applied: available, reason,
      modelOnlyHours: productionValues?.temperatureModelOnlyHours,
      supportedHours: lag === undefined ? [...series.values()].filter((temperature) => temperature !== undefined).length :
        available ? 480 - (productionValues?.temperatureModelOnlyHours ?? 0) : 0, totalHours: 480 };
    const encoded = JSON.stringify(record);
    expect(encoded).not.toMatch(/latitude|longitude|cellId|weatherGrid|soilGrid/i);
    appendFileSync(recordsFile, encoded + "\n");
  }
  const summary = { version: lag === undefined ? config.version : STATION_TEMPERATURE_VERSION, simulatedTrailingLagHours: lag, config, quality, records: inputs.length, appliedRecords: applied, coverage,
    stationCount: codes.length, observedStationHours: normalized.hours.length,
    provisionalStationHours: normalized.hours.filter((hour) => hour.validation === "provisional").length,
    modelSourceControls: sources.size, networkFetches: 0, failures: [],
    limitations: [`${codes.length}-station metadata pool; only eligible reporting donors enter each estimate`, "Production lag scenarios allow at most 12 contiguous trailing model-only hours; older gaps retain baseline", "Presence-only background dates are not verified absences", "Retrospective observation blend; not a forecast"] };
  writeFileSync(join(out, "replay-summary.json"), JSON.stringify(summary, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify(summary, null, 2));
}, 300_000);
