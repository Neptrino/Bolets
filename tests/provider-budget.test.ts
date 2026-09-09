import { describe, expect, it } from "vitest";
import { estimateOpenMeteoRequestUnits } from "@/supabase/functions/_shared/provider-budget";
import {
  configureOpenMeteoForecastHistoryRequest,
  configureOpenMeteoForecastRequest,
  configureOpenMeteoRequest,
  configureOpenMeteoRollingAtmosphereRequest,
  configureOpenMeteoRollingSeamlessPrecipitationRequest,
} from "@/supabase/functions/_shared/open-meteo";

function request(pastHours: number, variables = 6) {
  const url = new URL("https://api.open-meteo.com/v1/meteofrance");
  url.searchParams.set("past_hours", String(pastHours));
  url.searchParams.set("forecast_hours", "1");
  url.searchParams.set(
    "hourly",
    Array.from({ length: variables }, (_, index) => `variable_${index}`).join(","),
  );
  url.searchParams.set("models", "arome_france");
  return url;
}

describe("Open-Meteo budget estimates", () => {
  it("charges a conservative unit for each short-window location", () => {
    expect(estimateOpenMeteoRequestUnits(request(72), 50)).toBe(53);
  });

  it("accounts for the provider's higher weight beyond fourteen days", () => {
    const incremental = estimateOpenMeteoRequestUnits(request(72), 50);
    const bootstrap = estimateOpenMeteoRequestUnits(request(720), 50);
    expect(bootstrap).toBe(113);
    expect(bootstrap).toBeGreaterThan(incremental * 2);
  });

  it("rejects invalid location counts before reserving budget", () => {
    expect(() => estimateOpenMeteoRequestUnits(request(72), 0)).toThrow(RangeError);
  });

  it("accounts for inclusive archive dates including the interval endpoint day", () => {
    const url = new URL("https://historical-forecast-api.open-meteo.com/v1/forecast");
    url.searchParams.set("start_date", "2026-08-20");
    url.searchParams.set("end_date", "2026-09-09");
    url.searchParams.set("hourly", "temperature_2m");
    url.searchParams.set("models", "arome_france");
    expect(estimateOpenMeteoRequestUnits(url, 8)).toBe(13);
    url.searchParams.set("end_date", "2026-08-19");
    expect(() => estimateOpenMeteoRequestUnits(url, 8)).toThrow(RangeError);
    url.searchParams.set("end_date", "2026-02-30");
    expect(() => estimateOpenMeteoRequestUnits(url, 8)).toThrow(RangeError);
    url.searchParams.delete("end_date");
    expect(() => estimateOpenMeteoRequestUnits(url, 8)).toThrow(RangeError);
  });

  it("keeps the measured normal production workload observable", () => {
    const batchedEstimate = (locations: number, configure: (url: URL) => void) => {
      let total = 0;
      for (let start = 0; start < locations; start += 50) {
        const batchSize = Math.min(50, locations - start);
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        configure(url);
        total += estimateOpenMeteoRequestUnits(url, batchSize);
      }
      return total;
    };
    const atmosphere = batchedEstimate(
      5_128,
      (url) => configureOpenMeteoRollingAtmosphereRequest(url, false),
    );
    const fallback = batchedEstimate(
      500,
      (url) => configureOpenMeteoRollingSeamlessPrecipitationRequest(url, false),
    );
    const soilAndForecasts = [
      (url: URL) => configureOpenMeteoRequest(url, "soil"),
      (url: URL) => configureOpenMeteoForecastRequest(url, "atmosphere"),
      configureOpenMeteoForecastHistoryRequest,
      (url: URL) => configureOpenMeteoForecastRequest(url, "soil"),
    ].reduce((total, configure) => total + batchedEstimate(500, configure), 0);
    const regional = batchedEstimate(10, (url) => configureOpenMeteoRequest(url));
    const normalDay = atmosphere + fallback + soilAndForecasts + regional;

    // The 14-day outlook horizons (forecast_hours 337) added ~630 units to
    // the measured day; the three egress lanes share the load well inside
    // their combined allowance.
    expect(normalDay).toBe(10_209);
    expect(fallback).toBe(530);
    expect(normalDay + fallback).toBe(10_739);
  });
});
