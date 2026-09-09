import { createStationTemperatureScorer, type ThermalModelWindow } from "@/supabase/functions/_shared/station-temperature-scoring";
import { STATION_TEMPERATURE_VERSION } from "@/supabase/functions/_shared/station-temperature-field";
import { calculateSuitability } from "@/src/lib/scoring";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getSpecies } from "@/data/species";
import { conditionSnapshotSchema } from "@/src/lib/schema";
import { aggregateXemaTemperatureHours } from "@/supabase/functions/_shared/xema-temperature";
import type { XemaStation } from "@/supabase/functions/_shared/xema-rain";
import { compareCellObservedTemperature, intervalBiasAtInstant } from "@/scripts/lib/cell-temperature-impact";
import { createStationObservedTemperature } from "@/scripts/lib/station-temperature-interpolation";
import { blendStationModelTemperature, modelTemperatureAtElevation, stationModelBlendConfig } from "@/scripts/lib/station-temperature-blend";
import { BOUNDARY_COMPARISON, summarizeTemperatureBoundaries, temperatureBoundaryPairs, type BoundaryCell } from "@/scripts/lib/temperature-boundary-metrics";

const enabled = Boolean(process.env.TEMPERATURE_BOUNDARY_INPUT);
describe.skipIf(!enabled)("offline temperature boundary comparison", () => {
  beforeAll(() => vi.stubGlobal("fetch", async () => { throw new Error("Boundary replay must remain offline"); }));
  afterAll(() => vi.unstubAllGlobals());
  it("checks all orthogonal neighbours with fixed geometry and station support", async () => {
    const inputText = await readFile(process.env.TEMPERATURE_BOUNDARY_INPUT!, "utf8");
    const input = JSON.parse(inputText) as {
      design: { speciesId: string; comparablePair: object; newSevereJump: object };
      cells: { cellId: string; windowId: string; bounds: number[][]; values: { weatherObservedAt: string } }[];
      links: { cell_id: string; weather_point_id: string }[];
      states: { point_id: string; payload: { latitude: number; longitude: number; elevation: number;
        hourly: { time: number[]; temperature_2m: number[] } } }[];
    };
    const { newSevereJump, ...comparablePair } = BOUNDARY_COMPARISON;
    expect(input.design.comparablePair).toEqual(comparablePair);
    expect(input.design.newSevereJump).toEqual(newSevereJump);
    const species = getSpecies(input.design.speciesId);
    if (!species) throw new Error("Unknown species");
    const stationText = await readFile(process.env.TEMPERATURE_BOUNDARY_STATIONS!, "utf8");
    const stations = (JSON.parse(stationText).stations as XemaStation[]).sort((a, b) => a.station_code.localeCompare(b.station_code));
    const codes = new Set(stations.map((s) => s.station_code));
    const cache = process.env.TEMPERATURE_BOUNDARY_CACHE!;
    const validHours = input.cells.map((c) => Date.parse(c.values.weatherObservedAt));
    expect(new Set(validHours).size).toBe(1);
    const last = Math.max(...validHours), first = last - 480 * 3_600_000;
    const rows: unknown[] = [];
    const provenance: { file: string; sha256: string; fetchedAt: string }[] = [];
    for (const file of (await readdir(cache)).filter((f) => f.endsWith(".json")).sort()) {
      const text = await readFile(resolve(cache, file), "utf8");
      const entry = JSON.parse(text);
      const url = new URL(entry.url);
      if (url.origin !== "https://analisi.transparenciacatalunya.cat" || url.pathname !== "/resource/nzvn-apee.json") continue;
      const selected = entry.payload.filter((r: Record<string, unknown>) => {
        const at = typeof r.data_lectura === "string" ? Date.parse(r.data_lectura.replace(/Z$/, "") + "Z") : NaN;
        return codes.has(String(r.codi_estacio)) && String(r.codi_variable) === "32" && at >= first && at < last + 3_600_000;
      });
      if (selected.length) {
        rows.push(...selected);
        provenance.push({ file, sha256: createHash("sha256").update(text).digest("hex"), fetchedAt: entry.fetchedAt });
      }
    }
    const observations = aggregateXemaTemperatureHours(rows, "published");
    expect(observations.hours.length).toBeGreaterThan(0);
    const missingStation = process.env.TEMPERATURE_BOUNDARY_MISSING_STATION;
    const missingHour = last - 240 * 3_600_000;
    if (missingStation && !codes.has(missingStation)) throw new Error("Unknown outage station");
    const comparisonHours = observations.hours.filter((h) => !(missingStation && h.stationCode === missingStation && h.hour === missingHour));
    if (missingStation) expect(observations.hours.length - comparisonHours.length).toBe(1);
    const config = stationModelBlendConfig(process.env.TEMPERATURE_BOUNDARY_MODE ?? "original");
    const field = createStationObservedTemperature(comparisonHours, stations, config.lapseCPerKm, config.donorTaper);
    const links = new Map(input.links.map((l) => [l.cell_id, l.weather_point_id]));
    const sources = new Map(input.states.map(({ point_id, payload: state }) => {
      expect(state.hourly.time).toHaveLength(720);
      expect(state.hourly.temperature_2m).toHaveLength(720);
      expect(new Set(state.hourly.time).size).toBe(720);
      return [point_id, { latitude: state.latitude, longitude: state.longitude, elevationM: state.elevation,
        hours: new Map(state.hourly.time.map((second, i) => [second * 1000, state.hourly.temperature_2m[i]])) }];
    }));
    const modelIds = new Map([...sources.keys()].map((id) => [id, createHash("sha256").update(id).digest("hex")]));
    const models = new Map<string, ThermalModelWindow>([...sources].map(([id, source]) => [modelIds.get(id)!, {
      version: STATION_TEMPERATURE_VERSION, endAt: last, latitude: source.latitude, longitude: source.longitude,
      elevationM: source.elevationM, stationWindowId: "stations",
      temperaturesC: Array.from({ length: 480 }, (_, i) => source.hours.get(last - (479 - i) * 3_600_000)!),
    }]));
    const productionScore = createStationTemperatureScorer(models, new Map([["stations", {
      version: STATION_TEMPERATURE_VERSION, endAt: last, stations, hours: comparisonHours,
    }]]));
    const cells: BoundaryCell[] = [];
    for (const cell of input.cells) {
      const snapshot = conditionSnapshotSchema.parse(cell);
      const weatherPointId = links.get(cell.cellId);
      const source = weatherPointId && sources.get(weatherPointId);
      if (!weatherPointId || !source) throw new Error("Cell missing frozen source");
      const atCell = field({ station_code: cell.cellId,
        latitude: (cell.bounds[0][1] + cell.bounds[1][1]) / 2,
        longitude: (cell.bounds[0][0] + cell.bounds[1][0]) / 2, altitude_m: snapshot.values.altitudeM! });
      const replay = compareCellObservedTemperature(species, snapshot, source, (at) => blendStationModelTemperature(
        modelTemperatureAtElevation(source.hours.get(at), source.elevationM, snapshot.values.altitudeM!),
        intervalBiasAtInstant((hour) => atCell(hour)?.temperatureC, at)));
      if (config.donorTaper) {
        const values = productionScore({ ...snapshot.values, thermalSources: [{ id: modelIds.get(weatherPointId)! }] },
          (cell.bounds[0][1] + cell.bounds[1][1]) / 2, (cell.bounds[0][0] + cell.bounds[1][0]) / 2);
        const actual = calculateSuitability(species, { ...snapshot, values });
        const expected = replay.status === "available" ? replay.scenario : replay.baseline;
        expect(actual.opportunityIndex, cell.cellId).toBe(expected.score);
        expect(actual.fruitingConditionsScore, cell.cellId).toBe(expected.conditions);
        expect(values.weatherElevationM).toBe(snapshot.values.weatherElevationM);
        for (const key of Object.keys(snapshot.values)) if (!key.startsWith("temperatureAvg14") && !key.startsWith("temperatureAvg20") &&
          !key.startsWith("heatHours") && !key.startsWith("frostHours") && key !== "thermalExposure") {
          expect(values[key], key).toEqual(snapshot.values[key as keyof typeof snapshot.values]);
        }
      }
      cells.push({ cellId: cell.cellId, windowId: cell.windowId, weatherPointId,
        altitudeM: snapshot.values.altitudeM!, applied: replay.status === "available",
        reason: replay.status === "available" ? "applied" : replay.reason,
        baseline: replay.baseline, candidate: replay.status === "available" ? replay.scenario : replay.baseline });
    }
    const pairs = temperatureBoundaryPairs(cells);
    const counts = (selected: BoundaryCell[]) => Object.fromEntries([...new Set(selected.map((c) => c.reason))].sort()
      .map((reason) => [reason, selected.filter((c) => c.reason === reason).length]));
    const selectedPair = ["epsg25831:250:1739:18746", "epsg25831:250:1740:18746"].map((id) => cells.find((c) => c.cellId === id));
    expect(selectedPair.map((c) => c?.baseline.score)).toEqual([23, 60]);
    if (!missingStation && !config.donorTaper) expect(selectedPair.map((c) => c?.candidate.score)).toEqual([57, 59]);
    const report = {
      version: "station-temperature-boundary-comparison-v1", createdAt: new Date().toISOString(),
      speciesId: species.speciesId, observedAt: new Date(last).toISOString(), design: input.design,
      candidate: config,
      simulatedMissingHour: missingStation ? { stationCode: missingStation, hour: new Date(missingHour).toISOString(),
        description: "Operational sensitivity: one observed station hour removed, not an actual recorded outage." } : null,
      sourceSha256: createHash("sha256").update(inputText).digest("hex"),
      stationMetadataSha256: createHash("sha256").update(stationText).digest("hex"),
      stationCodes: [...codes], stationProvenance: provenance,
      completeStationHours: observations.hours.length,
      provisionalStationHours: observations.hours.filter((h) => h.validation === "provisional").length,
      conflictingStationReadings: observations.conflictingReadings,
      coverage: counts(cells), coverageByWindow: Object.fromEntries([...new Set(cells.map((c) => c.windowId))].sort()
        .map((id) => [id, counts(cells.filter((c) => c.windowId === id))])),
      summary: summarizeTemperatureBoundaries(pairs), cells, pairs,
    };
    const out = process.env.TEMPERATURE_BOUNDARY_OUTPUT!;
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ output: out, cells: cells.length, coverage: report.coverage,
      comparable: report.summary.comparable, crossWeather: report.summary.comparableCrossWeather,
      coverageEdges: report.summary.comparableCoverageEdges }, null, 2));
  }, 120_000);
});
