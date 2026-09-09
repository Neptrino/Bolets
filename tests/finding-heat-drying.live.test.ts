import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { getSpecies } from "@/data/species";
import { calculateSuitability } from "@/src/lib/scoring";
import type { ConditionSnapshot } from "@/src/lib/types";
import { rawDiagnostics } from "@/tests/helpers/finding-replay-scoring";
import type { EvaluationRecord } from "@/tests/helpers/finding-evaluation-report";
import { countBasedSpecies, heatDryingSnapshot, HEAT_DRYING_CANDIDATES } from "@/scripts/lib/heat-drying-candidates";
import { heatDegreeHoursFromTemperatures } from "@/supabase/functions/_shared/heat-intensity";
import { compareCellTemperature, type ThermalControl } from "@/scripts/lib/cell-temperature-impact";
import {
  blendStationModelTemperature, createStationObservedTemperature,
  modelTemperatureAtElevation, stationTemperatureTailLag, STATION_DONOR_TAPER,
} from "@/supabase/functions/_shared/station-temperature-field";
import { thermalAggregates } from "@/supabase/functions/_shared/station-temperature-scoring";
import type { XemaStation } from "@/supabase/functions/_shared/xema-rain";
import type { StationTemperatureHour } from "@/supabase/functions/_shared/xema-temperature";

type Record = EvaluationRecord & {
  offsetDaysFromFinding?: number;
  modelVersion: string;
  temperatureBlend: { applied: boolean; version: string; modelOnlyHours?: number };
};
type Input = {
  record: Record; snapshot: ConditionSnapshot; sourceId: string;
  representative: { latitude: number; longitude: number; elevationM: number };
  centre: { latitude: number; longitude: number };
};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const key = (r: Record) => [r.kind, r.location, r.speciesId, r.date, r.offsetDaysFromFinding ?? ""].join("|");
const jsonl = <T,>(path: string): T[] => readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line));
const HOUR = 3_600_000;

it.skipIf(!process.env.HEAT_DRYING_INPUTS)("compares heat and drying candidates with exact frozen production controls", () => {
  vi.stubGlobal("fetch", () => { throw new Error("Heat/drying evaluation must remain offline"); });
  try {
    const directory = process.env.HEAT_DRYING_INPUTS!;
    const out = process.env.HEAT_DRYING_OUTPUT!;
    const manifestText = readFileSync(process.env.HEAT_DRYING_MANIFEST!, "utf8");
    const manifest = JSON.parse(manifestText) as {
      plannedOnly: boolean; stations: XemaStation[]; days: string[];
      normalizedDays: { day: string; sha256: string }[];
    };
    expect(manifest.plannedOnly).toBe(false);
    expect(manifest.normalizedDays.map((d) => d.day).sort()).toEqual([...manifest.days].sort());
    const hours: StationTemperatureHour[] = [];
    for (const entry of manifest.normalizedDays) {
      expect(entry.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const encoded = readFileSync(join(process.env.HEAT_DRYING_CACHE!, entry.day + ".json"), "utf8");
      expect(hash(encoded)).toBe(entry.sha256);
      hours.push(...(JSON.parse(encoded) as { hours: StationTemperatureHour[] }).hours);
    }
    const field = createStationObservedTemperature(hours, manifest.stations, 6.5, STATION_DONOR_TAPER);
    const inputs = jsonl<Input>(join(directory, "inputs.jsonl"));
    const baselineRecords = jsonl<Record>(process.env.HEAT_DRYING_BASELINE!);
    expect(baselineRecords.length).toBe(inputs.length);
    const baseline = new Map(baselineRecords.map((r) => [key(r), r]));
    expect(baseline.size).toBe(baselineRecords.length);
    const sources = new Map<string, ThermalControl>();
    const output = new Map(HEAT_DRYING_CANDIDATES.map((c) => [c.name, [] as object[]]));
    let controlledSeries = 0;
    let blendedSeries = 0;
    for (const input of inputs) {
      const record = baseline.get(key(input.record))!;
      expect(record).toBeDefined();
      expect(record.temperatureBlend.version).toBe("xema-arome-blend-v3");
      const profile = getSpecies(record.speciesId)!;
      const species = countBasedSpecies(profile);
      expect(species.modelConfig.version).toBe(record.modelVersion);
      expect(input.sourceId).toMatch(/^[a-f0-9]{64}$/);
      let source = sources.get(input.sourceId);
      if (!source) {
        const encoded = readFileSync(join(directory, "sources", input.sourceId + ".json"), "utf8");
        expect(hash(encoded)).toBe(input.sourceId);
        const raw = JSON.parse(encoded) as {
          latitude: number; longitude: number; elevation: number;
          hourly: { time: number[]; temperature_2m: number[] };
        };
        expect(raw.hourly.time.length).toBe(raw.hourly.temperature_2m.length);
        expect(new Set(raw.hourly.time).size).toBe(raw.hourly.time.length);
        source = { latitude: raw.latitude, longitude: raw.longitude, elevationM: raw.elevation,
          hours: new Map(raw.hourly.time.map((t, i) => [t * 1000, raw.hourly.temperature_2m[i]])) };
        sources.set(input.sourceId, source);
      }
      expect(source.latitude).toBeCloseTo(input.representative.latitude, 4);
      expect(source.longitude).toBeCloseTo(input.representative.longitude, 4);
      expect(source.elevationM).toBeCloseTo(input.representative.elevationM, 2);
      let snapshot: ConditionSnapshot = { ...input.snapshot, values: { ...input.snapshot.values,
        weatherGridLatitude: input.representative.latitude, weatherGridLongitude: input.representative.longitude } };
      const control = compareCellTemperature(species, snapshot, source, () => 0);
      expect(control.baseline.conditions).toBe(input.record.fruitingConditionsScore);
      expect(control.baseline.score).toBe(input.record.opportunityIndex);
      let series: number[] | undefined;
      if (control.status === "available") {
        const end = Date.parse(snapshot.values.weatherObservedAt!);
        series = Array.from({ length: 480 }, (_, i) => source!.hours.get(end - (479 - i) * HOUR)!);
        if (record.temperatureBlend.applied) {
          const altitude = snapshot.values.altitudeM!;
          const at = field({ station_code: "cell", ...input.centre, altitude_m: altitude });
          const intervals = Array.from({ length: 481 }, (_, i) => at(end - (480 - i) * HOUR, false));
          const lag = stationTemperatureTailLag(intervals.map(Boolean));
          expect(lag).toBeDefined();
          expect(lag).toBe(record.temperatureBlend.modelOnlyHours);
          series = series.map((t, i) => {
            const before = intervals[i], after = intervals[i + 1];
            // Exactly the production tail: raw provider exposure, aligned means.
            return before && after ? blendStationModelTemperature(
              modelTemperatureAtElevation(t, source!.elevationM, altitude),
              (before.temperatureC + after.temperatureC) / 2,
            )! : t;
          });
          const aggregates = thermalAggregates(series);
          const delta = modelTemperatureAtElevation(0, source.elevationM, altitude)!;
          aggregates.temperatureAvg14dC += delta * lag! / 336;
          aggregates.temperatureAvg20dC += delta * lag! / 480;
          snapshot = { ...snapshot, values: { ...snapshot.values, ...aggregates,
            thermalReferenceElevationM: altitude, thermalExposure: undefined } };
          blendedSeries++;
        }
        controlledSeries++;
      } else {
        expect(record.temperatureBlend.applied).toBe(false);
      }
      const baselineScore = calculateSuitability(species, snapshot);
      expect(baselineScore.fruitingConditionsScore).toBe(record.fruitingConditionsScore);
      expect(baselineScore.opportunityIndex).toBe(record.opportunityIndex);
      if (baselineScore.fruitingConditionsScore !== null) {
        const raw = rawDiagnostics(species, snapshot.observedAt, snapshot.values);
        for (const name of ["water", "phenology", "temperature", "extremes", "habitatFactor"] as const) {
          expect(raw[name]).toBeCloseTo(record.raw[name]!, 10);
        }
      }
      for (const candidate of HEAT_DRYING_CANDIDATES) {
        // Never recover a previously unavailable reading or shorten a window.
        if (baselineScore.fruitingConditionsScore === null) {
          output.get(candidate.name)!.push(record);
          continue;
        }
        const scenario = heatDryingSnapshot(snapshot, candidate, series);
        const score = calculateSuitability(species, scenario);
        if (candidate.name === "heat-6c") {
          const production = calculateSuitability(profile, { ...snapshot,
            values: { ...snapshot.values, ...heatDegreeHoursFromTemperatures(series) } });
          expect(production.fruitingConditionsScore).toBe(score.fruitingConditionsScore);
          expect(production.opportunityIndex).toBe(score.opportunityIndex);
        }
        const raw = rawDiagnostics(species, scenario.observedAt, scenario.values);
        expect(score.fruitingConditionsScore).not.toBeNull();
        expect(raw.phenology).toBe(record.raw.phenology);
        expect(raw.habitatFactor).toBe(record.raw.habitatFactor);
        output.get(candidate.name)!.push({ ...record, raw,
          fruitingConditionsScore: score.fruitingConditionsScore, opportunityIndex: score.opportunityIndex,
          heatDryingCandidate: { ...candidate, controlledHeatSeries: !!series },
        });
      }
    }
    mkdirSync(out, { recursive: true, mode: 0o700 });
    for (const [name, records] of output) {
      const folder = join(out, name);
      mkdirSync(folder, { recursive: true, mode: 0o700 });
      const encoded = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
      expect(encoded).not.toMatch(/latitude|longitude|cellId|weatherGrid|soilGrid/i);
      writeFileSync(join(folder, "evaluation-records.jsonl"), encoded, { mode: 0o600 });
    }
    const summary = { candidates: HEAT_DRYING_CANDIDATES, records: inputs.length,
      controlledSeries, blendedSeries, unchangedHeatFallbacks: inputs.length - controlledSeries,
      manifestSha256: hash(manifestText),
      baselineSha256: hash(readFileSync(process.env.HEAT_DRYING_BASELINE!, "utf8")),
      inputsSha256: hash(readFileSync(join(directory, "inputs.jsonl"), "utf8")),
      networkFetches: 0, productionChanges: false,
      limitations: ["Exploratory reuse of calibration findings; not independent validation",
        "Degree-hours are a sensitivity prior, not measured biological damage",
        "Heat-only change: original frost penalty, source assignment and recency retained",
        "Baseline fallbacks use original unshifted model hours for heat severity",
        "Synthetic ET and heat-count fields exist only in private scoring snapshots"] };
    writeFileSync(join(out, "summary.json"), JSON.stringify(summary, null, 2) + "\n", { mode: 0o600 });
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    vi.unstubAllGlobals();
  }
}, 300_000);
