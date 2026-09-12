import { afterEach, describe, expect, it, vi } from "vitest";
import { createRasterWorkerClient } from "@/components/region-map/raster-worker-client";
import { rasterizePreparedHeatRaster, type PreparedHeatRaster } from "@/components/region-map/prediction-raster";

const prepared: PreparedHeatRaster = {
  raster: { width: 8, height: 8, left: 0, top: 0, scale: 1 }, supportWeight: 1,
  samples: [{ x: 4, y: 4, sigma: 2, score: 50, alpha: 0.7 }],
};
function setup() {
  const worker = { postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null, onmessageerror: null };
  const client = createRasterWorkerClient(() => worker as unknown as Worker);
  const answer = (index: number) => {
    const job = worker.postMessage.mock.calls[index][0];
    (worker as unknown as Worker).onmessage!({ data: { id: job.id, raster: rasterizePreparedHeatRaster(job.prepared) } } as MessageEvent);
  };
  return { worker, client, answer };
}
afterEach(() => vi.useRealTimers());
describe("bounded raster worker", () => {
  it("returns the same pixels as the shared synchronous calculation", async () => {
    const { client, answer } = setup();
    const result = client.render(prepared);
    answer(0);
    expect(await result).toEqual(rasterizePreparedHeatRaster(prepared));
    client.dispose();
  });
  it("keeps only the latest pending frame and discards an obsolete running result", async () => {
    const { worker, client, answer } = setup();
    const first = client.render(prepared), second = client.render(prepared), third = client.render(prepared);
    expect(await second).toBeUndefined();
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    answer(0);
    expect(await first).toBeUndefined();
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
    answer(1);
    expect(await third).toEqual(rasterizePreparedHeatRaster(prepared));
    client.dispose();
  });
  it("settles waiting callers and terminates the worker on navigation", async () => {
    const { worker, client, answer } = setup();
    const first = client.render(prepared), next = client.render(prepared);
    client.dispose();
    expect(await first).toBeUndefined();
    expect(await next).toBeUndefined();
    expect(worker.terminate).toHaveBeenCalledOnce();
    answer(0); // A late message cannot repaint or start another job.
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    expect(await client.render(prepared)).toBeUndefined();
  });
  it("falls back to the same calculation when worker creation is blocked", async () => {
    const client = createRasterWorkerClient(() => { throw new Error("Blocked"); });
    expect(await client.render(prepared)).toEqual(rasterizePreparedHeatRaster(prepared));
    client.dispose();
  });
  it("recovers only the latest frame if a worker hangs", async () => {
    vi.useFakeTimers();
    const { worker, client } = setup();
    const first = client.render(prepared), next = client.render(prepared);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await first).toBeUndefined();
    expect(await next).toEqual(rasterizePreparedHeatRaster(prepared));
    expect(worker.terminate).toHaveBeenCalledOnce();
    client.dispose();
  });
});
