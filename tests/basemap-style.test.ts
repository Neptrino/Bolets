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

  it("composes transparent hillshade below grey topographic references", () => {
    const style = basemapStyle("icgc-relief");
    const relief = style.sources["icgc-shaded-relief"];
    const references = style.sources["icgc-relief-references"];

    expect(relief).toMatchObject({
      type: "raster",
      tileSize: 256,
      maxzoom: 18,
    });
    expect(references).toMatchObject({
      type: "raster",
      tileSize: 256,
      maxzoom: 18,
    });
    expect("tiles" in relief ? relief.tiles?.[0] : "").toContain(
      "model-elevacions-terreny-ombrejat-catalunya-topografic-5m-2009-2018",
    );
    expect("tiles" in references ? references.tiles?.[0] : "").toContain(
      "LAYERS=topografic-gris",
    );
    expect(style.layers.map((layer) => layer.id)).toEqual([
      "icgc-relief-background",
      "icgc-shaded-relief",
      "icgc-relief-references",
    ]);
  });

  it("uses stronger terrain shading in the shared relief basemap", () => {
    const relief = basemapStyle("icgc-relief");

    expect(relief.layers[1]).toMatchObject({
      paint: { "raster-contrast": 0.36, "raster-opacity": 0.96 },
    });
    expect(relief.layers[2]).toMatchObject({
      paint: { "raster-opacity": 0.7 },
    });
  });

  it("does not restore a saved basemap on static maps without layer controls", () => {
    const regionMapSource = readFileSync("components/region-map.tsx", "utf8");

    expect(regionMapSource).toContain(
      "rememberSelection: interactive",
    );
  });
});
