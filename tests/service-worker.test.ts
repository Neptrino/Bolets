import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const worker = readFileSync("public/sw.js", "utf8");
const origin = "https://bolets.app";
const imagePath = "/media/optimized/v11/contributed/boletus-pinophilus-field-aleix-20250913.w1920.webp";

type FetchEventStub = {
  request: { method: string; mode: string; url: string };
  respondWith: (response: Promise<Response>) => void;
  waitUntil: (work: Promise<unknown>) => void;
};

function setup() {
  const handlers = new Map<string, (event: FetchEventStub) => void>();
  const entries = new Map<string, Response>();
  const put = vi.fn(async (request: FetchEventStub["request"], response: Response) => {
    // Like Cache.put, completion requires reading the whole body.
    const body = await response.arrayBuffer();
    entries.set(request.url, new Response(body, { headers: response.headers }));
  });
  const match = vi.fn(async (request: FetchEventStub["request"]) => entries.get(request.url)?.clone());
  const open = vi.fn(async () => ({ put, keys: async () => [] }));
  const fetch = vi.fn(async () => new Response("fresh"));
  runInNewContext(worker, {
    self: {
      location: { origin },
      addEventListener: (name: string, handler: (event: FetchEventStub) => void) => handlers.set(name, handler),
    },
    caches: { open, match },
    fetch,
    Headers,
    Response,
    URL,
  });

  function dispatch(path: string, mode = "cors") {
    let response: Promise<Response> | undefined;
    const work: Promise<unknown>[] = [];
    handlers.get("fetch")!({
      request: { method: "GET", mode, url: new URL(path, origin).href },
      respondWith: (value) => { response = value; },
      waitUntil: (value) => { work.push(value); },
    });
    return { response, work };
  }

  return { dispatch, entries, fetch, put, open };
}

describe("service worker response delivery", () => {
  it.each([
    ["/bolets", "navigate"],
    [imagePath, "navigate"],
    ["/_next/static/chunk.js", "cors"],
    ["/api/predictions?resolution=5000", "cors"],
    ["/api/findings", "cors"],
    ["/api/habitat?resolution=5000", "cors"],
    ["https://tile.openstreetmap.org/1/0/0.png", "cors"],
  ])("delivers %s while its cache write is still pending", async (path, mode) => {
    const { dispatch, put, fetch } = setup();
    let finishWrite!: () => void;
    put.mockImplementation(() => new Promise<void>((resolve) => { finishWrite = resolve; }));
    const network = new Response("fresh");
    fetch.mockResolvedValue(network);
    const event = dispatch(path, mode);
    let delivered: Response | undefined;
    void event.response!.then((response) => { delivered = response; });
    // Flush promise continuations without allowing the cache write to finish.
    for (let step = 0; step < 20; step++) await Promise.resolve();
    try {
      expect(put).toHaveBeenCalledOnce();
      expect(delivered).toBe(network);
      expect(event.work).toHaveLength(1);
    } finally {
      finishWrite();
      await Promise.all(event.work);
    }
  });

  it("does not replace fresh data with an old copy when storage is full", async () => {
    const { dispatch, put, entries } = setup();
    entries.set(`${origin}/api/predictions?resolution=5000`, new Response("old"));
    put.mockRejectedValue(new Error("QuotaExceededError"));
    const event = dispatch("/api/predictions?resolution=5000");
    expect(await (await event.response!).text()).toBe("fresh");
    await expect(Promise.all(event.work)).resolves.toBeDefined();
  });

  it("reuses a versioned image for both embedded and direct navigation requests", async () => {
    const { dispatch, fetch, open } = setup();
    const first = dispatch(imagePath);
    await first.response;
    await Promise.all(first.work);
    const direct = dispatch(imagePath, "navigate");
    expect(await (await direct.response!).text()).toBe("fresh");
    await Promise.all(direct.work);
    expect(fetch).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith("bolets-assets-v4");
  });

  it("fetches a new image when its version changes", async () => {
    const { dispatch, fetch } = setup();
    for (const path of [imagePath, imagePath.replace("/v11/", "/v12/")]) {
      const event = dispatch(path);
      await event.response;
      await Promise.all(event.work);
    }
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("still uses the dated cached prediction when the network fails", async () => {
    const { dispatch, fetch, entries } = setup();
    entries.set(`${origin}/api/predictions?resolution=5000`, new Response("old", {
      headers: { "x-bolets-cached-at": "2026-09-04T00:00:00.000Z" },
    }));
    fetch.mockRejectedValue(new Error("Offline"));
    const event = dispatch("/api/predictions?resolution=5000");
    const response = await event.response!;
    expect(await response.text()).toBe("old");
    expect(response.headers.get("x-bolets-cached-at")).toBe("2026-09-04T00:00:00.000Z");
    await Promise.all(event.work);
  });

  it.each(["/admin", "/admin/operacions", "/compte", "/api/me/findings", "/api/predictions?resolution=1000"])(
    "leaves private request %s outside worker caches", (path) => {
      const { dispatch, fetch, open } = setup();
      expect(dispatch(path, "navigate").response).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
      expect(open).not.toHaveBeenCalled();
    },
  );
});
