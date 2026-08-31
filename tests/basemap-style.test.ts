import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  basemapOptions,
  basemapStyle,
  defaultBasemapId,
} from "@/components/region-map/basemaps";

describe("region map basemaps", () => {
  it("makes the shaded ICGC relief the default", () => {
    expect(defaultBasemapId).toBe("icgc-relief");
    expect(basemapOptions[0]).toMatchObject({
      id: "icgc-relief",
      label: "Relleu ombrejat",
      provider: "ICGC",
    });
  });

  it("preserves the strong hillshade and topographic-reference composition", () => {
    const style = basemapStyle("icgc-relief");
    const relief = style.sources["icgc-shaded-relief"];
    const references = style.sources["icgc-relief-references"];

    expect(relief).toMatchObject({
      type: "raster",
      tileSize: 256,
      maxzoom: 18,
    });
    expect("tiles" in relief ? relief.tiles?.[0] : "").toContain(
      "/api/map-tiles/icgc/v1/relief/{z}/{x}/{y}",
    );
    expect("tiles" in references ? references.tiles?.[0] : "").toContain(
      "/api/map-tiles/icgc/v1/references/{z}/{x}/{y}",
    );
    expect(style.layers.map((layer) => layer.id)).toEqual([
      "icgc-relief-background",
      "icgc-shaded-relief",
      "icgc-relief-references",
    ]);
    expect(style.layers[1]).toMatchObject({
      paint: { "raster-contrast": 0.36, "raster-opacity": 0.96 },
    });
    expect(style.layers[2]).toMatchObject({
      paint: { "raster-opacity": 0.7 },
    });
  });

  it("keeps only Esri World Topographic among the Esri choices", () => {
    const style = basemapStyle("esri-topographic");
    const source = Object.values(style.sources)[0];

    expect(source).toMatchObject({
      type: "raster",
      tileSize: 256,
      maxzoom: 23,
    });
    expect("tiles" in source ? source.tiles?.[0] : "").toBe(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    );
    expect("attribution" in source ? source.attribution : "").toContain(
      "OpenStreetMap contributors",
    );
    expect(basemapOptions.filter(({ provider }) => provider === "Esri").map(({ id }) => id))
      .toEqual(["esri-topographic"]);
  });

  it("adds the cached ICGC Simplificat layer", () => {
    const source = Object.values(basemapStyle("icgc-simplified").sources)[0];

    expect("tiles" in source ? source.tiles?.[0] : "").toBe(
      "/api/map-tiles/icgc/v1/simplified/{z}/{x}/{y}?encoding=jpeg-v1",
    );
  });

  it("does not restore a saved basemap on static maps without layer controls", () => {
    const regionMapSource = readFileSync("components/region-map.tsx", "utf8");

    expect(regionMapSource).toContain(
      "rememberSelection: interactive",
    );
  });
});
