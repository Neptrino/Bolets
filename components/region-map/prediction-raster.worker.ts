import { rasterizePreparedHeatRaster, type PreparedHeatRaster } from "./prediction-raster";

self.onmessage = (event: MessageEvent<{ id: number; prepared: PreparedHeatRaster }>) => {
  const raster = rasterizePreparedHeatRaster(event.data.prepared);
  self.postMessage({ id: event.data.id, raster }, { transfer: [raster.pixels.buffer] });
};
