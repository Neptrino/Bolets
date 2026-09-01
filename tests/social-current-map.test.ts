import { describe, expect, it } from "vitest";

import {
  SOCIAL_CURRENT_MAP_HEIGHT,
  SOCIAL_CURRENT_MAP_WIDTH,
  socialCurrentMapOverlaySvg,
  socialCurrentMapWmsUrl,
} from "@/src/lib/social-current-map";
import type { PredictionMapCell } from "@/src/lib/types";

function mapCell(score: number | null): PredictionMapCell {
  return {
    cellId: "epsg25831:2500:185:1865",
    gridSizeM: 2500,
    cellBounds: [[1.25, 41.45], [1.28, 41.48]],
    habitatCoverage: 0.72,
    score,
  };
}

describe("social current map", () => {
  it("uses the official ICGC grayscale map at the rendered dimensions", () => {
    const url = new URL(socialCurrentMapWmsUrl());

    expect(url.origin).toBe("https://geoserveis.icgc.cat");
    expect(url.pathname).toBe("/servei/catalunya/mapa-base/wms");
    expect(url.searchParams.get("LAYERS")).toBe("topografic-gris");
    expect(url.searchParams.get("SRS")).toBe("EPSG:3857");
    expect(url.searchParams.get("WIDTH")).toBe(String(SOCIAL_CURRENT_MAP_WIDTH));
    expect(url.searchParams.get("HEIGHT")).toBe(String(SOCIAL_CURRENT_MAP_HEIGHT));
    expect(url.searchParams.get("BBOX")?.split(",")).toHaveLength(4);
  });

  it("clips positive prediction cells to the real Catalunya outline", () => {
    const svg = socialCurrentMapOverlaySvg([mapCell(74)]);

    expect(svg).toContain('<clipPath id="catalunya">');
    expect(svg).toContain('clip-path="url(#catalunya)"');
    expect(svg).toContain('<feGaussianBlur stdDeviation="5"');
    expect(svg).toContain("<rect ");
    expect(svg).toContain('stroke="rgba(255,255,255,0.72)"');
  });

  it("does not paint withheld or verified-zero cells", () => {
    const svg = socialCurrentMapOverlaySvg([mapCell(null), mapCell(0)]);

    expect(svg).not.toContain("<rect ");
  });
});
