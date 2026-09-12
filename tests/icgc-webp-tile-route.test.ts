import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import { GET } from "@/app/api/map-tiles/icgc/v2/[layer]/[z]/[x]/[y]/route";

const context = (layer = "relief") => ({ params: Promise.resolve({ layer, z: "7", x: "64", y: "47" }) });
const request = new Request("https://bolets.test/api/map-tiles/icgc/v2/relief/7/64/47");
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("cached WebP map tiles", () => {
  it("allows cold downloads to proceed while other tiles wait for the provider", async () => {
    const png = await sharp({ create: { width: 256, height: 256, channels: 3, background: "white" } }).png().toBuffer();
    const releases: Array<() => void> = [];
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => releases.push(() =>
      resolve(new Response(png, { headers: { "Content-Type": "image/png" } }))))));
    const jobs = Array.from({ length: 4 }, (_, i) => GET(request, {
      params: Promise.resolve({ layer: "relief", z: "7", x: String(60 + i), y: "47" }),
    }));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(4));
    releases.forEach(release => release());
    const results = await Promise.all(jobs);
    expect(results.every(response => response.ok)).toBe(true);
  });
  it("coalesces concurrent encodings and preserves dimensions and transparency", async () => {
    const png = await sharp({ create: { width: 256, height: 256, channels: 4,
      background: { r: 90, g: 110, b: 130, alpha: 0.5 } } }).png().toBuffer();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(png, { headers: { "Content-Type": "image/png" } })));
    const [first, second] = await Promise.all([GET(request, context()), GET(request, context())]);
    expect(fetch).toHaveBeenCalledOnce();
    const image = Buffer.from(await first.arrayBuffer());
    expect(Buffer.from(await second.arrayBuffer())).toEqual(image);
    expect(first.headers.get("content-type")).toBe("image/webp");
    expect(first.headers.get("cache-control")).toContain("immutable");
    expect(first.headers.get("content-length")).toBe(String(image.length));
    expect(await sharp(image).metadata()).toMatchObject({ width: 256, height: 256, hasAlpha: true });
    const { data } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBeCloseTo(128, -1);
  });

  it("retains the tile allowlist without fetching invalid providers", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const response = await GET(request, context("unknown"));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not cache invalid images or retain rejected in-flight work", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not an image", { headers: { "Content-Type": "image/png" } })));
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await GET(request, context());
      expect(response.status).toBe(502);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects oversized provider images before full decoding", async () => {
    const png = await sharp({ create: { width: 512, height: 512, channels: 3, background: "white" } }).png().toBuffer();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(png, { headers: { "Content-Type": "image/png" } })));
    const response = await GET(request, context());
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
