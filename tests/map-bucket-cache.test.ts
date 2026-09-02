import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAP_BUCKET_CACHE_NAME,
  MAP_BUCKET_CACHE_TTL_MS,
  readMapBucketPayload,
  writeMapBucketPayload,
} from "@/src/lib/map-bucket-cache";

function installCacheStorage() {
  const stored = new Map<string, Response>();
  const cache = {
    delete: vi.fn(async (request: Request) => stored.delete(request.url)),
    keys: vi.fn(async () =>
      [...stored.keys()].map((url) => new Request(url)),
    ),
    match: vi.fn(async (request: Request) => stored.get(request.url)?.clone()),
    put: vi.fn(async (request: Request, response: Response) => {
      stored.set(request.url, response.clone());
    }),
  };
  const open = vi.fn(async () => cache);
  vi.stubGlobal("window", { caches: { open } });
  return { cache, open };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("persistent map bucket cache", () => {
  const url = "https://bolets.test/api/predictions?resolution=2500&v=test";
  const payload = {
    cells: [{ cellId: "cell-1", score: 42 }],
    truncated: false,
  };

  it("retains reusable browser buckets for one hour", () => {
    expect(MAP_BUCKET_CACHE_TTL_MS).toBe(60 * 60 * 1_000);
  });

  it("reuses a public bucket inside the bounded freshness window", async () => {
    const { open } = installCacheStorage();
    const storedAt = Date.parse("2026-08-30T08:00:00.000Z");

    await writeMapBucketPayload(url, payload, storedAt);

    await expect(
      readMapBucketPayload(url, storedAt + MAP_BUCKET_CACHE_TTL_MS),
    ).resolves.toEqual(payload);
    expect(open).toHaveBeenCalledWith(MAP_BUCKET_CACHE_NAME);
  });

  it("deletes an expired bucket instead of presenting it as current", async () => {
    const { cache } = installCacheStorage();
    const storedAt = Date.parse("2026-08-30T08:00:00.000Z");
    await writeMapBucketPayload(url, payload, storedAt);

    await expect(
      readMapBucketPayload(url, storedAt + MAP_BUCKET_CACHE_TTL_MS + 1),
    ).resolves.toBeNull();
    expect(cache.delete).toHaveBeenCalledOnce();
  });

  it("falls back cleanly when Cache Storage is unavailable", async () => {
    await expect(readMapBucketPayload(url)).resolves.toBeNull();
    await expect(writeMapBucketPayload(url, payload)).resolves.toBeUndefined();
  });

  it("does not persist contributor-only detailed buckets", async () => {
    const { open } = installCacheStorage();
    const detailedUrl = "https://bolets.test/api/predictions?resolution=1000&v=test";

    await writeMapBucketPayload(detailedUrl, payload);

    await expect(readMapBucketPayload(detailedUrl)).resolves.toBeNull();
    expect(open).not.toHaveBeenCalled();
  });
});
