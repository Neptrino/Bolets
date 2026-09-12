import { rasterizePreparedHeatRaster, type PreparedHeatRaster, type PredictionHeatRaster } from "./prediction-raster";

type Job = {
  id: number;
  prepared: PreparedHeatRaster;
  resolve: (raster: PredictionHeatRaster | undefined) => void;
};

/** One running calculation and one replaceable pending frame per map. */
export function createRasterWorkerClient(createWorker = () => new Worker(
  new URL("./prediction-raster.worker.ts", import.meta.url), { type: "module" },
)) {
  let worker: Worker | undefined;
  let running: Job | undefined;
  let pending: Job | undefined;
  let nextId = 0;
  let failed = false;
  let disposed = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const fallback = () => {
    failed = true;
    clearTimeout(timeout);
    worker?.terminate();
    worker = undefined;
    const latest = pending ?? running;
    if (running !== latest) running?.resolve(undefined);
    running = pending = undefined;
    latest?.resolve(rasterizePreparedHeatRaster(latest.prepared));
  };
  const start = (job: Job) => {
    running = job;
    try {
      if (!worker) {
        worker = createWorker();
        worker.onmessage = (event: MessageEvent<{ id: number; raster: PredictionHeatRaster }>) => {
          if (event.data.id !== running?.id || disposed) return;
          clearTimeout(timeout);
          running.resolve(pending ? undefined : event.data.raster);
          running = undefined;
          if (pending) { const next = pending; pending = undefined; start(next); }
        };
        worker.onerror = fallback;
        worker.onmessageerror = fallback;
      }
      worker.postMessage({ id: job.id, prepared: job.prepared });
      timeout = setTimeout(fallback, 10_000);
    } catch { fallback(); }
  };
  return {
    render(prepared: PreparedHeatRaster): Promise<PredictionHeatRaster | undefined> {
      if (disposed) return Promise.resolve(undefined);
      if (failed) return Promise.resolve(rasterizePreparedHeatRaster(prepared));
      return new Promise((resolve) => {
        const job = { id: ++nextId, prepared, resolve };
        if (running) {
          pending?.resolve(undefined);
          pending = job;
        } else start(job);
      });
    },
    dispose() {
      disposed = true;
      clearTimeout(timeout);
      worker?.terminate();
      running?.resolve(undefined);
      pending?.resolve(undefined);
      running = pending = undefined;
    },
  };
}
