import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { areaBounds, areaProfiles, areasBySlug, getPlace, nearbyPlaces, placeDistanceKm, placeProfiles } from "@/data/location-pages";
import { PLACE_BANNER_FOCUS_X, PLACE_BANNER_HEIGHT, PLACE_BANNER_WIDTH, PLACE_MAP_HEIGHT, PLACE_MAP_WIDTH, areaMapFilePath, areaMapSpec, placeBannerSpec, placeMapFilePath, placeMapPath, placeMapSpec, placeMapUpstreamUrl } from "@/src/lib/place-map";

const root = path.resolve(__dirname, "..");

const camprodon = getPlace("ripolles", "camprodon")!;
const setcases = getPlace("ripolles", "setcases")!;

describe("place map portrait", () => {
  it("frames the place centre with a constant ground scale", () => {
    const spec = placeMapSpec(camprodon);
    const [west, south, east, north] = spec.bbox;
    expect(spec.width).toBe(PLACE_MAP_WIDTH);
    expect(spec.height).toBe(PLACE_MAP_HEIGHT);
    // Web Mercator units stretch by 1/cos(lat); the ground width stays ~11 km.
    const stretch = 1 / Math.cos((camprodon.mapCentre[1] * Math.PI) / 180);
    expect((east - west) / stretch / 1000).toBeCloseTo(spec.groundWidthKm, 1);
    expect((north - south) / (east - west)).toBeCloseTo(PLACE_MAP_HEIGHT / PLACE_MAP_WIDTH, 5);
    expect(spec.scaleBar.widthPercent).toBeGreaterThan(10);
    expect(spec.scaleBar.widthPercent).toBeLessThan(30);
  });

  it("requests the ICGC grey topographic layer at the portrait size", () => {
    const url = new URL(placeMapUpstreamUrl(camprodon));
    expect(url.hostname).toBe("geoserveis.icgc.cat");
    expect(url.searchParams.get("LAYERS")).toBe("topografic-gris");
    expect(url.searchParams.get("WIDTH")).toBe(String(PLACE_MAP_WIDTH));
    expect(url.searchParams.get("HEIGHT")).toBe(String(PLACE_MAP_HEIGHT));
    expect(url.searchParams.get("BBOX")?.split(",")).toHaveLength(4);
  });

  it("versions the public path so a reframed portrait busts caches", () => {
    expect(placeMapPath(camprodon)).toMatch(/^\/media\/place-maps\/ripolles\/camprodon\.webp\?v=v\d+$/);
  });

  it("frames a whole area wider than a place, with a round scale bar", () => {
    const area = areasBySlug.ripolles;
    const spec = areaMapSpec(areaBounds(area));
    expect(spec.groundWidthKm).toBeGreaterThan(placeMapSpec(camprodon).groundWidthKm);
    expect([1000, 2000, 5000, 10_000, 20_000, 50_000]).toContain(spec.scaleBar.metres);
    expect(spec.scaleBar.widthPercent).toBeGreaterThanOrEqual(12);
    expect(spec.scaleBar.widthPercent).toBeLessThan(40);
  });

  it("puts the place under the pin, right of centre, in the guide banner", () => {
    const spec = placeBannerSpec(camprodon);
    const [west, , east] = spec.bbox;
    const { x } = { x: ((2.3649 * Math.PI) / 180) * 6378137 };
    expect(spec.focus.x).toBe(PLACE_BANNER_FOCUS_X);
    expect((x - west) / (east - west)).toBeCloseTo(PLACE_BANNER_FOCUS_X, 5);
    expect(spec.groundWidthKm).toBeGreaterThan(placeMapSpec(camprodon).groundWidthKm);
  });

  it("ships every rendered portrait and banner at the expected size", async () => {
    const files = [
      ...areaProfiles.map((area) => ({ id: area.slug, file: areaMapFilePath(area), size: [PLACE_MAP_WIDTH, PLACE_MAP_HEIGHT] })),
      ...placeProfiles.flatMap((place) => [
        { id: `${place.areaSlug}/${place.slug}`, file: placeMapFilePath(place), size: [PLACE_MAP_WIDTH, PLACE_MAP_HEIGHT] },
        { id: `${place.areaSlug}/${place.slug} banner`, file: placeMapFilePath(place, "banner"), size: [PLACE_BANNER_WIDTH, PLACE_BANNER_HEIGHT] },
      ]),
    ];
    const missing = files.filter(({ file }) => !existsSync(path.join(root, file)));
    expect(missing.map(({ id }) => id), "run `npm run maps:places`").toEqual([]);
    for (const { id, file, size } of files) {
      const metadata = await sharp(path.join(root, file)).metadata();
      expect([metadata.format, metadata.width, metadata.height], id).toEqual(["webp", ...size]);
    }
  });
});

describe("nearby places", () => {
  it("measures great-circle distance between documented places", () => {
    const distance = placeDistanceKm(camprodon, setcases);
    expect(distance).toBeGreaterThan(6);
    expect(distance).toBeLessThan(10);
    expect(placeDistanceKm(camprodon, camprodon)).toBe(0);
  });

  it("lists the closest other places first and never the place itself", () => {
    const nearby = nearbyPlaces(camprodon, 3);
    expect(nearby).toHaveLength(3);
    expect(nearby.map(({ place }) => place.slug)).not.toContain("camprodon");
    expect(nearby[0].distanceKm).toBeLessThanOrEqual(nearby[1].distanceKm);
    expect(nearby[1].distanceKm).toBeLessThanOrEqual(nearby[2].distanceKm);
    expect(nearby.map(({ place }) => place.slug)).toContain("setcases");
  });
});
