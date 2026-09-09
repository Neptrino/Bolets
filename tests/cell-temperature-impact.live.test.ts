import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getSpecies } from "@/data/species";
import { conditionSnapshotSchema } from "@/src/lib/schema";
import { aggregateXemaTemperatureHours, modelIntervalMean } from "@/supabase/functions/_shared/xema-temperature";
import type { XemaStation } from "@/supabase/functions/_shared/xema-rain";
import { createStationTemperatureBias, normalizeArchivedTemperature, type TemperaturePair } from "@/scripts/lib/station-temperature-evaluation";
import { compareCellTemperature, compareCellObservedTemperature, intervalBiasAtInstant } from "@/scripts/lib/cell-temperature-impact";
import { createStationObservedTemperature } from "@/scripts/lib/station-temperature-interpolation";
import { blendStationModelTemperature, modelTemperatureAtElevation, STATION_MODEL_BLEND_EXPERIMENT } from "@/scripts/lib/station-temperature-blend";

const enabled = Boolean(process.env.CELL_TEMPERATURE_INPUT);
describe.skipIf(!enabled)("offline cell temperature impact", () => {
  beforeAll(() => vi.stubGlobal("fetch", async () => { throw new Error("Cell temperature replay must remain offline"); }));
  afterAll(() => vi.unstubAllGlobals());
  it("replays frozen cells against station corrections with identical nonthermal inputs", async () => {
    const inputPath = process.env.CELL_TEMPERATURE_INPUT!;
    const cache = process.env.CELL_TEMPERATURE_CACHE!;
    const stationReport = process.env.CELL_TEMPERATURE_STATIONS!;
    const out = process.env.CELL_TEMPERATURE_OUTPUT!;
    const splitAt = Date.parse(process.env.CELL_TEMPERATURE_TRAINING_END!);
    const startAt = Date.parse(process.env.CELL_TEMPERATURE_TRAINING_START!);
    if (![splitAt, startAt].every(Number.isFinite) || splitAt <= startAt) throw new Error("Invalid station training window");
    type Cell = { cellId: string; bounds: number[][]; values: { weatherObservedAt: string } };
    type State = { point_id: string; payload: { latitude: number; longitude: number; elevation: number; hourly: { time: number[]; temperature_2m: number[] } } };
    const input = JSON.parse(await readFile(inputPath, "utf8")) as {
      cells: Cell[]; links: { cell_id: string; weather_point_id: string }[];
      points: { point_id: string; requested_lat: number; requested_lon: number }[];
      states: State[];
    };
    const species = getSpecies(process.env.CELL_TEMPERATURE_SPECIES ?? "boletus-edulis");
    if (!species) throw new Error("Unknown species");
    const stations = (JSON.parse(await readFile(stationReport, "utf8")).stations as XemaStation[])
      .sort((a, b) => a.station_code.localeCompare(b.station_code));
    const endAt = Math.max(...input.cells.map((cell) => Date.parse(cell.values.weatherObservedAt)));
    if (!(endAt >= splitAt)) throw new Error("Cells precede the end of the training window");
    const firstExposureAt = Math.min(...input.cells.map((cell) => Date.parse(cell.values.weatherObservedAt))) - 479 * 3_600_000;
    if (splitAt > firstExposureAt) throw new Error("Training dates overlap the scored exposure window");
    const rows: unknown[] = [];
    const modelEntries: { url: URL; payload: unknown[] }[] = [];
    for (const file of (await readdir(cache)).filter((name) => name.endsWith(".json"))) {
      const entry = JSON.parse(await readFile(resolve(cache, file), "utf8"));
      const url = new URL(entry.url);
      if (url.hostname === "analisi.transparenciacatalunya.cat" && url.pathname === "/resource/nzvn-apee.json") rows.push(...entry.payload);
      if (url.hostname === "historical-forecast-api.open-meteo.com" && url.searchParams.get("models") === "arome_france") modelEntries.push({ url, payload: entry.payload });
    }
    const model = new Map(stations.map((station) => [station.station_code, new Map<number, number>()]));
    modelEntries.sort((a, b) => String(a.url.searchParams.get("start_date")).localeCompare(String(b.url.searchParams.get("start_date"))));
    for (const entry of modelEntries) {
      const from = Date.parse(entry.url.searchParams.get("start_date")! + "T00:00:00Z");
      const until = Date.parse(entry.url.searchParams.get("end_date")! + "T23:00:00Z");
      if (until < startAt || from > endAt) continue;
      expect(entry.payload).toHaveLength(stations.length);
      for (const [index, station] of stations.entries()) {
        const hours = normalizeArchivedTemperature(entry.payload[index], station).hours;
        const target = model.get(station.station_code)!;
        for (const [at, temperature] of hours) {
          const existing = target.get(at);
          if (existing !== undefined && Math.abs(existing - temperature) > 0.02) throw new Error("Overlapping station archives disagree; freeze one consistent source");
          target.set(at, temperature);
        }
      }
    }
    const observations = aggregateXemaTemperatureHours(rows, "published");
    const pairs: TemperaturePair[] = observations.hours.flatMap((hour) => {
      if (hour.hour < startAt || hour.hour > endAt) return [];
      const series = model.get(hour.stationCode);
      const modelC = series ? modelIntervalMean(series, hour.hour) : undefined;
      return modelC === undefined ? [] : [{ ...hour, modelC }];
    });
    expect(pairs.length).toBeGreaterThan(0);
    const fields = {
      diurnal: createStationTemperatureBias(pairs, stations, splitAt, "diurnal"),
      contemporaneous: createStationTemperatureBias(pairs, stations, splitAt, "contemporaneous"),
    };
    const observedFields = {
      elevationAdjusted: createStationObservedTemperature(observations.hours, stations, 6.5),
      noLapse: createStationObservedTemperature(observations.hours, stations, 0),
    };
    const cells = input.cells.map((cell) => {
      const snapshot = conditionSnapshotSchema.parse(cell);
      const pointId = input.links.find((link) => link.cell_id === cell.cellId)?.weather_point_id;
      const point = input.points.find((point) => point.point_id === pointId);
      const state = input.states.find((state) => state.point_id === pointId)?.payload;
      if (!point || !state) throw new Error("Cell lacks its exact representative weather source");
      expect(state.hourly.time).toHaveLength(720);
      expect(state.hourly.temperature_2m).toHaveLength(720);
      expect(new Set(state.hourly.time).size).toBe(720);
      const source = { latitude: state.latitude, longitude: state.longitude, elevationM: state.elevation,
        hours: new Map(state.hourly.time.map((second, i) => [second * 1000, state.hourly.temperature_2m[i]])) };
      const target = { station_code: point.point_id, latitude: point.requested_lat, longitude: point.requested_lon, altitude_m: state.elevation };
      const compare = (mode: keyof typeof fields) => {
        const field = fields[mode](target);
        return compareCellTemperature(species, snapshot, source, (instant) => intervalBiasAtInstant((at) => field(at)?.biasC, instant));
      };
      const cellTarget = { station_code: cell.cellId,
        latitude: (cell.bounds[0][1] + cell.bounds[1][1]) / 2,
        longitude: (cell.bounds[0][0] + cell.bounds[1][0]) / 2, altitude_m: snapshot.values.altitudeM! };
      const compareCellBias = (mode: keyof typeof fields) => {
        const field = fields[mode](cellTarget);
        return compareCellTemperature(species, snapshot, source, (instant) => intervalBiasAtInstant((at) => field(at)?.biasC, instant));
      };
      const compareObserved = (mode: keyof typeof observedFields) => {
        const field = observedFields[mode](cellTarget);
        return compareCellObservedTemperature(species, snapshot, source,
          (instant) => intervalBiasAtInstant((at) => field(at)?.temperatureC, instant));
      };
      const donorField = observedFields.elevationAdjusted(cellTarget);
      const modelAtCell = (instant: number) => modelTemperatureAtElevation(source.hours.get(instant), source.elevationM, cellTarget.altitude_m);
      const modelOnlyCellElevation = compareCellObservedTemperature(species, snapshot, source, modelAtCell);
      const stationModelBlend = compareCellObservedTemperature(species, snapshot, source,
        (instant) => blendStationModelTemperature(modelAtCell(instant),
          intervalBiasAtInstant((at) => donorField(at)?.temperatureC, instant)));
      const donorHours: Record<string, number> = {};
      for (let i = 0; i <= 480; i++) {
        for (const donor of donorField(Date.parse(snapshot.values.weatherObservedAt!) - i * 3_600_000)?.donors ?? []) {
          donorHours[donor.code] = (donorHours[donor.code] ?? 0) + 1;
        }
      }
      return { cellId: cell.cellId, bounds: cell.bounds, altitudeM: snapshot.values.altitudeM,
        weatherPointId: pointId, weatherElevationM: state.elevation,
        diurnal: compare("diurnal"), contemporaneous: compare("contemporaneous"),
        cellDiurnal: compareCellBias("diurnal"), cellContemporaneous: compareCellBias("contemporaneous"),
        observedElevationAdjusted: compareObserved("elevationAdjusted"), observedNoLapse: compareObserved("noLapse"),
        modelOnlyCellElevation, stationModelBlend,
        observedDonorHours: donorHours, observedDonorsAtEnd: donorField(Date.parse(snapshot.values.weatherObservedAt!))?.donors };
    });
    const report = {
      version: "cell-temperature-impact-shadow-v3", createdAt: new Date().toISOString(), speciesId: species.speciesId,
      observedAt: new Date(endAt).toISOString(), trainingStart: new Date(startAt).toISOString(), trainingEndExclusive: new Date(splitAt).toISOString(),
      stationCount: stations.length, stationPairedHours: pairs.length,
      provisionalStationHours: pairs.filter((pair) => pair.validation === "provisional").length,
      method: "Representative-point and actual-cell station residuals, plus direct XEMA observation interpolation at cell coordinates/elevation with fixed 6.5 C/km or zero lapse. Exact baseline thermal control; only 14/20-day thermal aggregates change. Direct estimates require every hour supported and disable the subsequent means lapse to avoid double correction; water stays unchanged. Interval-centre interpolation is an approximation, not instantaneous observed temperature.",
      limitations: ["Experimental XEMA correction, not observed 250 m weather", "Published provisional readings included", "This is score sensitivity, not findings validation or a deployed scoring change"],
      stationModelBlend: { ...STATION_MODEL_BLEND_EXPERIMENT,
        method: "Average instantaneous model and interpolated station estimates after shifting each to the cell elevation; recount thresholds after averaging, never average counts or scores. Model-only cell-elevation control separates the hourly lapse effect. Incomplete blend support withholds only the comparison; the baseline remains available." },
      cells,
    };
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(report, null, 2) + "\n");
    const selected = cells.filter((cell) => ["epsg25831:250:1739:18746", "epsg25831:250:1740:18746"].includes(cell.cellId));
    console.log(JSON.stringify({ report: out, cells: cells.length, selected, pairedHours: pairs.length, provisionalHours: report.provisionalStationHours }, null, 2));
  });
});
