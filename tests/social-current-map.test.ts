import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { Map as MapLibreMap } from "maplibre-gl";
import { drawPredictionSurface } from "@/components/region-map/prediction-surface";
import {
  SOCIAL_CURRENT_MAP_HEIGHT,
  SOCIAL_CURRENT_MAP_WIDTH,
  socialCurrentMapBounds,
  socialCurrentMapOverlaySvg,
  socialCurrentMapRaster,
  socialCurrentMapWmsUrl,
} from "@/src/lib/social-current-map";
import type { PredictionMapCell } from "@/src/lib/types";

function mapCell(score: number | null, habitatCoverage: number | null = 0.72): PredictionMapCell {
  return {
    cellId: "epsg25831:2500:185:1865", gridSizeM: 2500,
    cellBounds: [[1.25, 41.45], [1.28, 41.48]], habitatCoverage, score,
  };
}

const bounds = socialCurrentMapBounds();
function project([longitude, latitude]: [number, number]) {
  const x = 6_378_137 * longitude * Math.PI / 180;
  const y = 6_378_137 * Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));
  return {
    x: (x - bounds.west) / (bounds.east - bounds.west) * SOCIAL_CURRENT_MAP_WIDTH,
    y: (bounds.north - y) / (bounds.north - bounds.south) * SOCIAL_CURRENT_MAP_HEIGHT,
  };
}

function maximumAlpha(score: number, coverage: number | null) {
  const raster = socialCurrentMapRaster([mapCell(score, coverage)])!;
  let max = 0;
  for (let offset = 3; offset < raster.pixels.length; offset += 4) max = Math.max(max, raster.pixels[offset]);
  return max;
}

afterEach(() => vi.unstubAllGlobals());

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

  it("matches the actual Avui canvas raster for mixed scores and forest coverage", () => {
    const cells = [mapCell(69, 0.02), { ...mapCell(20, 0.6), cellBounds: [[1.28, 41.45], [1.31, 41.48]] } as PredictionMapCell,
      { ...mapCell(0), cellBounds: [[1.25, 41.48], [1.28, 41.51]] } as PredictionMapCell, mapCell(null)];
    const social = socialCurrentMapRaster(cells)!;
    let browserPixels: Uint8ClampedArray | undefined;
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (image: { data: Uint8ClampedArray }) => { browserPixels = image.data; },
    }) }) });
    const drawImage = vi.fn();
    drawPredictionSurface({
      cells, localMap: { project } as unknown as MapLibreMap, rendering: "heatmap", selectedCellId: null,
      context: { save() {}, restore() {}, drawImage } as unknown as CanvasRenderingContext2D,
      output: { clientWidth: SOCIAL_CURRENT_MAP_WIDTH, clientHeight: SOCIAL_CURRENT_MAP_HEIGHT } as HTMLCanvasElement,
    });
    // Compare every byte natively; deep equality walks millions of properties
    // and can exceed CI's test deadline even when both rasters are identical.
    expect(Buffer.from(browserPixels!).equals(Buffer.from(social.pixels))).toBe(true);
    expect(drawImage.mock.calls[0].slice(1)).toEqual([social.left, social.top, social.width * social.scale, social.height * social.scale]);
  });

  it("fades sparse matching forest and low scores using the Avui rules", () => {
    const dense = maximumAlpha(69, 0.8);
    expect(maximumAlpha(69, 0.02)).toBeCloseTo(dense * 0.06, 0);
    expect(maximumAlpha(69, null)).toEqual(maximumAlpha(69, 0.02));
    expect(maximumAlpha(69, 0.3)).toBeGreaterThan(maximumAlpha(69, 0.1));
    expect(maximumAlpha(2, 0.8)).toBeCloseTo(dense / 2, 0);
    expect(maximumAlpha(0, 0.8)).toBe(0);
    expect(socialCurrentMapRaster([mapCell(null)])).toBeNull();
  });

  it("clips the raster to Catalunya without applying another opacity or blur", async () => {
    const width = SOCIAL_CURRENT_MAP_WIDTH, height = SOCIAL_CURRENT_MAP_HEIGHT;
    const png = await sharp({ create: { width, height, channels: 4, background: { r: 100, g: 150, b: 30, alpha: 0.8 } } }).png().toBuffer();
    const raster = { left: 0, top: 0, scale: 1, width, height, pixels: new Uint8ClampedArray() };
    const svg = socialCurrentMapOverlaySvg(raster, `data:image/png;base64,${png.toString("base64")}`);
    const image = sharp(Buffer.from(svg));
    const inside = project([1.6, 42]);
    const alphaAt = async (left: number, top: number) => (await image.clone().extract({ left, top, width: 1, height: 1 }).ensureAlpha().raw().toBuffer())[3];
    expect(await alphaAt(Math.round(inside.x), Math.round(inside.y))).toBe(204);
    expect(await alphaAt(width - 1, height - 1)).toBe(0);
    expect(svg).not.toContain("opacity=");
    expect(svg).not.toContain("feGaussianBlur");
  });
});
