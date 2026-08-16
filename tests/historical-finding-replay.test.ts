import { describe, expect, it, vi } from "vitest";
import {
  gridDisplacementMetres,
  HISTORICAL_FORECAST_ENDPOINT,
  historicalForecastRequestUrl,
  parsePrivateHistoricalFindings,
} from "@/tests/helpers/historical-finding-replay";

describe("private historical finding replay", () => {
  it("accepts dated current-prediction species without adding labels to the private input", () => {
    vi.setSystemTime(new Date("2026-08-15T12:00:00Z"));
    const [finding] = parsePrivateHistoricalFindings(JSON.stringify([{
      observedAt: "2025-09-13T12:00:00+02:00",
      latitude: 41.5,
      longitude: 2.1,
      speciesIds: ["boletus-edulis", "boletus-pinophilus"],
    }]));

    expect(finding.observedAt).toBe("2025-09-13T10:00:00.000Z");
    expect(finding.speciesIds).toEqual(["boletus-edulis", "boletus-pinophilus"]);
  });

  it("rejects timestamps without an explicit offset and unknown species", () => {
    const base = {
      latitude: 41.5,
      longitude: 2.1,
      speciesIds: ["boletus-edulis"],
    };
    expect(() => parsePrivateHistoricalFindings(JSON.stringify([{
      ...base,
      observedAt: "2025-09-13T12:00:00",
    }]))).toThrow(/explicit offset/);
    expect(() => parsePrivateHistoricalFindings(JSON.stringify([{
      ...base,
      observedAt: "2025-09-13T12:00:00+02:00",
      speciesIds: ["not-a-species"],
    }]))).toThrow(/current predictions/);
  });

  it("builds exact AROME and contract-compatible best-match soil archive requests", () => {
    const atmosphere = historicalForecastRequestUrl({
      profile: "atmosphere",
      latitude: 41.5,
      longitude: 2.1,
      elevationM: 1250,
      targetAt: "2025-09-13T10:00:00Z",
    });
    const soil = historicalForecastRequestUrl({
      profile: "soil",
      latitude: 41.5,
      longitude: 2.1,
      targetAt: "2025-09-13T10:00:00Z",
    });
    const iconEuSoil = historicalForecastRequestUrl({
      profile: "soil",
      latitude: 41.5,
      longitude: 2.1,
      targetAt: "2025-09-13T10:00:00Z",
      model: "icon_eu",
    });
    const iconGlobalSoil = historicalForecastRequestUrl({
      profile: "soil",
      latitude: 41.5,
      longitude: 2.1,
      targetAt: "2025-09-13T10:00:00Z",
      model: "icon_global",
    });

    expect(atmosphere.origin + atmosphere.pathname).toBe(HISTORICAL_FORECAST_ENDPOINT);
    expect(atmosphere.searchParams.get("models")).toBe("arome_france");
    expect(atmosphere.searchParams.get("hourly")).toContain("et0_fao_evapotranspiration");
    expect(atmosphere.searchParams.get("elevation")).toBe("1250");
    expect(atmosphere.searchParams.get("start_date")).toBe("2025-08-13");
    expect(atmosphere.searchParams.get("end_date")).toBe("2025-09-13");
    expect(soil.searchParams.get("models")).toBe("best_match");
    expect(soil.searchParams.get("hourly")).toBe("soil_moisture_3_to_9cm");
    expect(soil.searchParams.has("elevation")).toBe(false);
    expect(soil.searchParams.get("timeformat")).toBe("unixtime");
    expect(iconEuSoil.searchParams.get("models")).toBe("icon_eu");
    expect(iconGlobalSoil.searchParams.get("models")).toBe("icon_global");
    expect(() => historicalForecastRequestUrl({
      profile: "atmosphere",
      latitude: 41.5,
      longitude: 2.1,
      targetAt: "2025-09-13T10:00:00Z",
      model: "icon_eu",
    })).toThrow(/invalid for the requested profile/);
  });

  it("reports only a displacement magnitude for provider grid checks", () => {
    expect(gridDisplacementMetres(42, 2, 42, 2)).toBe(0);
    expect(gridDisplacementMetres(42, 2, 42.01, 2)).toBeGreaterThan(1_000);
  });
});
