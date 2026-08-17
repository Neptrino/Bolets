import { describe, expect, it } from "vitest";
import { bucketsForBounds } from "@/src/lib/map-query";
import { habitatBucketUrl, predictionBucketUrl } from "@/src/lib/map-request-url";
import { enumerateZonePackRequests } from "@/src/lib/zone-packs";

const catalonia = { west: 0.05, south: 40.48, east: 3.32, north: 42.92 };
const zone = { west: 2.2, south: 42.25, east: 2.35, north: 42.35 };

describe("offline zone packs", () => {
  it("asks for exactly the URLs the live map would request for the same ground", () => {
    const packed = new Set(
      enumerateZonePackRequests(zone, "boletus-edulis", catalonia).map((r) => r.url),
    );

    // Replays what the map itself builds when a viewport sits over this zone.
    for (const resolution of [250, 1000] as const) {
      for (const bucket of bucketsForBounds(zone, resolution, catalonia)) {
        expect(packed).toContain(predictionBucketUrl(bucket, "boletus-edulis", resolution));
        expect(packed).toContain(habitatBucketUrl(bucket, "boletus-edulis", resolution));
      }
    }
  });

  it("covers both layers at both resolutions with no duplicates", () => {
    const requests = enumerateZonePackRequests(zone, "boletus-edulis", catalonia);
    const expectedBuckets =
      bucketsForBounds(zone, 250, catalonia).length +
      bucketsForBounds(zone, 1000, catalonia).length;

    expect(requests).toHaveLength(expectedBuckets * 2);
    expect(new Set(requests.map((r) => r.url)).size).toBe(requests.length);
    expect(requests.filter((r) => r.layer === "predictions")).toHaveLength(expectedBuckets);
  });

  it("keeps packs for different species apart", () => {
    const cep = enumerateZonePackRequests(zone, "boletus-edulis", catalonia).map((r) => r.url);
    const rovello = enumerateZonePackRequests(zone, "lactarius-deliciosus", catalonia)
      .map((r) => r.url);

    expect(cep.some((url) => rovello.includes(url))).toBe(false);
  });

  it("requests nothing for a zone outside the service boundary", () => {
    expect(enumerateZonePackRequests(
      { west: 5.0, south: 44.0, east: 5.2, north: 44.2 },
      "boletus-edulis",
      catalonia,
    )).toEqual([]);
  });

  it("stays within the area each resolution is allowed to serve", () => {
    for (const request of enumerateZonePackRequests(zone, "boletus-edulis", catalonia)) {
      const params = new URLSearchParams(request.url.split("?")[1]);
      expect(Number(params.get("resolution"))).toBe(request.resolution);
      expect(params.get("species")).toBe("boletus-edulis");
    }
  });
});
