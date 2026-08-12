import { beforeEach, describe, expect, it, vi } from "vitest";

const occurrenceMocks = vi.hoisted(() => ({
  getOccurrenceSupport: vi.fn(),
}));

vi.mock("@/src/lib/occurrences", () => occurrenceMocks);

import { GET } from "@/app/api/occurrences/route";

describe("occurrence support API", () => {
  beforeEach(() => occurrenceMocks.getOccurrenceSupport.mockReset());

  it("rejects unknown species", async () => {
    const response = await GET(new Request(
      "http://localhost/api/occurrences?species=unknown&west=1&south=41&east=2&north=42",
    ));

    expect(response.status).toBe(400);
    expect(occurrenceMocks.getOccurrenceSupport).not.toHaveBeenCalled();
  });

  it("returns only the map fields needed for historical hatching", async () => {
    occurrenceMocks.getOccurrenceSupport.mockResolvedValue({
      available: true,
      cells: [{
        supportCellId: "epsg25831:10000:45:468",
        gridSizeM: 10_000,
        bounds: [[1.1, 41.1], [1.2, 41.2]],
        recordCount: 8,
        observedYearMin: 1982,
        observedYearMax: 2021,
        observedMonths: [9, 10],
        sources: [{ title: "FungaCAT" }],
      }],
    });

    const response = await GET(new Request(
      "http://localhost/api/occurrences?species=boletus-edulis&west=1&south=41&east=2&north=42&resolution=10000",
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=3600");
    await expect(response.json()).resolves.toEqual({
      available: true,
      cells: [{
        bounds: [[1.1, 41.1], [1.2, 41.2]],
        recordCount: 8,
      }],
    });
  });
});
