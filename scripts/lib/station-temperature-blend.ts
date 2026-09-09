import type { XemaStation } from "../../supabase/functions/_shared/xema-rain.ts";
import type { StationTemperatureHour } from "../../supabase/functions/_shared/xema-temperature.ts";
import { temperatureMetrics, type TemperaturePair } from "./station-temperature-evaluation.ts";
import { createStationObservedTemperature } from "./station-temperature-interpolation.ts";

export { STATION_MODEL_BLEND_EXPERIMENT, stationModelBlendConfig, modelTemperatureAtElevation, blendStationModelTemperature } from "../../supabase/functions/_shared/station-temperature-field.ts";
import { stationModelBlendConfig, modelTemperatureAtElevation, blendStationModelTemperature } from "../../supabase/functions/_shared/station-temperature-field.ts";

/** Fixed 50/50 candidate, target station entirely omitted from the XEMA input. */
export function evaluateStationModelBlend(
  pairs: TemperaturePair[], observations: StationTemperatureHour[], stations: XemaStation[],
  providerElevations: Map<string, number>, splitAt: number,
  mode = "original",
) {
  const config = stationModelBlendConfig(mode);
  const field = createStationObservedTemperature(observations, stations, config.lapseCPerKm, config.donorTaper);
  const results = stations.map((station) => {
    const elevationM = providerElevations.get(station.station_code);
    if (elevationM === undefined || !Number.isFinite(elevationM)) throw new Error("Missing model elevation for station blend control");
    const at = field(station);
    const test = pairs.filter((pair) => pair.stationCode === station.station_code && pair.hour >= splitAt);
    const model = test.map((pair) => modelTemperatureAtElevation(pair.modelC, elevationM, station.altitude_m)!);
    const estimates = test.map((pair, i) => blendStationModelTemperature(model[i], at(pair.hour)?.temperatureC));
    const supported = test.filter((_, i) => estimates[i] !== undefined);
    return {
      stationCode: station.station_code,
      modelElevationAdjustmentC: modelTemperatureAtElevation(0, elevationM, station.altitude_m)!,
      baseline: temperatureMetrics(test),
      withModelFallback: temperatureMetrics(test, test.map((pair, i) => estimates[i] ?? pair.modelC)),
      supportedBaseline: temperatureMetrics(supported),
      supportedModelAltitudeControl: temperatureMetrics(supported, model.filter((_, i) => estimates[i] !== undefined)),
      supportedBlend: temperatureMetrics(supported, estimates.filter((value): value is number => value !== undefined)),
    };
  });
  const active = results.filter((row) => row.supportedBaseline.pairedHours > 0);
  const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  type Metric = "supportedBaseline" | "supportedModelAltitudeControl" | "supportedBlend";
  const mae = (kind: Metric) => mean(active.map((row) => row[kind].maeC!));
  const errors = (kind: Metric, threshold: "heat" | "frost") => active.reduce((sum, row) =>
    sum + row[kind][`${threshold}FalsePositiveHours`] + row[kind][`${threshold}FalseNegativeHours`], 0);
  return {
    config,
    validation: "Same-hour peer observations, leave one whole target station out. Model shifted only from its returned DEM elevation to target station elevation, then averaged 50/50 with elevation-adjusted XEMA interpolation. Fixed settings; no fitting or weight search. Supported comparisons share exactly the same hours; unsupported overall hours retain raw AROME.",
    splitAt: new Date(splitAt).toISOString(), stations: results,
    summary: {
      testedHours: results.reduce((sum, row) => sum + row.baseline.pairedHours, 0),
      supportedHours: active.reduce((sum, row) => sum + row.supportedBaseline.pairedHours, 0),
      supportedStations: active.length,
      baselineMeanStationMaeC: mae("supportedBaseline"), modelAltitudeMeanStationMaeC: mae("supportedModelAltitudeControl"),
      blendMeanStationMaeC: mae("supportedBlend"),
      baselineHeatErrors: errors("supportedBaseline", "heat"), modelAltitudeHeatErrors: errors("supportedModelAltitudeControl", "heat"), blendHeatErrors: errors("supportedBlend", "heat"),
      baselineFrostErrors: errors("supportedBaseline", "frost"), modelAltitudeFrostErrors: errors("supportedModelAltitudeControl", "frost"), blendFrostErrors: errors("supportedBlend", "frost"),
    },
  };
}
