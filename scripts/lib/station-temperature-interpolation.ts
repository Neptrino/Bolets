import type { XemaStation } from "../../supabase/functions/_shared/xema-rain.ts";
import type { StationTemperatureHour } from "../../supabase/functions/_shared/xema-temperature.ts";
import { STATION_BIAS_EXPERIMENT, temperatureMetrics, type TemperaturePair } from "./station-temperature-evaluation.ts";

export { createStationObservedTemperature } from "../../supabase/functions/_shared/station-temperature-field.ts";
import { createStationObservedTemperature } from "../../supabase/functions/_shared/station-temperature-field.ts";

/** Omit the entire target station. Same-hour peer observations remain inputs. */
export function evaluateStationInterpolation(
  pairs: TemperaturePair[], observations: StationTemperatureHour[], stations: XemaStation[],
  splitAt: number, lapseCPerKm: 0 | 6.5 = 6.5,
) {
  const field = createStationObservedTemperature(observations, stations, lapseCPerKm);
  const results = stations.map((station) => {
    const at = field(station);
    const test = pairs.filter((pair) => pair.stationCode === station.station_code && pair.hour >= splitAt);
    const estimates = test.map((pair) => at(pair.hour)?.temperatureC);
    const supported = test.filter((_, i) => estimates[i] !== undefined);
    return {
      stationCode: station.station_code,
      baseline: temperatureMetrics(test),
      withModelFallback: temperatureMetrics(test, test.map((pair, i) => estimates[i] ?? pair.modelC)),
      supportedBaseline: temperatureMetrics(supported),
      supportedInterpolation: temperatureMetrics(supported, estimates.filter((value): value is number => value !== undefined)),
    };
  });
  const active = results.filter((row) => row.supportedBaseline.pairedHours > 0);
  const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const errors = (kind: "supportedBaseline" | "supportedInterpolation", threshold: "heat" | "frost") =>
    active.reduce((sum, row) => sum + row[kind][`${threshold}FalsePositiveHours`] + row[kind][`${threshold}FalseNegativeHours`], 0);
  return {
    version: "xema-observed-interpolation-shadow-v1", lapseCPerKm,
    spatialConfig: STATION_BIAS_EXPERIMENT,
    validation: "Leave one whole station out; same-hour observations at other stations only; fixed weights and lapse, no fitting. Retrospective hourly-mean proxies, not a forecast or an independent final test.",
    splitAt: new Date(splitAt).toISOString(), stations: results,
    summary: {
      testedHours: results.reduce((sum, row) => sum + row.baseline.pairedHours, 0),
      supportedHours: active.reduce((sum, row) => sum + row.supportedBaseline.pairedHours, 0),
      supportedStations: active.length,
      supportedBaselineMeanStationMaeC: mean(active.map((row) => row.supportedBaseline.maeC!)),
      supportedInterpolationMeanStationMaeC: mean(active.map((row) => row.supportedInterpolation.maeC!)),
      baselineHeatErrors: errors("supportedBaseline", "heat"), interpolationHeatErrors: errors("supportedInterpolation", "heat"),
      baselineFrostErrors: errors("supportedBaseline", "frost"), interpolationFrostErrors: errors("supportedInterpolation", "frost"),
    },
  };
}
