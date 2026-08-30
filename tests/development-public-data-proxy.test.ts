import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyDevelopmentPublicDataGet } from "@/src/lib/development-public-data-proxy";

describe("development public data proxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is disabled outside development and without an explicit origin", async () => {
    const request = new Request("http://localhost:3101/api/predictions?species=all");

    await expect(proxyDevelopmentPublicDataGet(
      request,
      "/api/predictions",
      { NODE_ENV: "production", BOLETS_DEV_PUBLIC_DATA_ORIGIN: "https://bolets.app" },
    )).resolves.toBeNull();
    await expect(proxyDevelopmentPublicDataGet(
      request,
      "/api/predictions",
      { NODE_ENV: "development" },
    )).resolves.toBeNull();
  });

  it("forwards only a public GET query and safe cache headers", async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      expect(String(input)).toBe(
        "https://bolets.app/api/predictions?species=all&resolution=10000",
      );
      const headers = new Headers(init?.headers);
      expect(headers.get("accept")).toBe("application/json");
      expect(headers.get("authorization")).toBeNull();
      expect(headers.get("cookie")).toBeNull();
      return Response.json({ cells: [{ cellId: "example", score: 73 }] }, {
        headers: {
          "Cache-Control": "public, max-age=60",
          "Set-Cookie": "must-not-reach-local-browser=true",
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxyDevelopmentPublicDataGet(
      new Request(
        "http://localhost:3101/api/predictions?species=all&resolution=10000",
        {
          headers: {
            Accept: "application/json",
            Authorization: "Bearer local-secret",
            Cookie: "local-session=private",
          },
        },
      ),
      "/api/predictions",
      { NODE_ENV: "development", BOLETS_DEV_PUBLIC_DATA_ORIGIN: "https://bolets.app" },
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response?.status).toBe(200);
    expect(response?.headers.get("cache-control")).toBe("public, max-age=60");
    expect(response?.headers.get("set-cookie")).toBeNull();
    expect(response?.headers.get("x-bolets-data-source")).toBe("production-public-api");
    await expect(response?.json()).resolves.toEqual({
      cells: [{ cellId: "example", score: 73 }],
    });
  });

  it("fails closed for an unsafe origin", async () => {
    const response = await proxyDevelopmentPublicDataGet(
      new Request("http://localhost:3101/api/habitat?species=boletus-edulis"),
      "/api/habitat",
      { NODE_ENV: "development", BOLETS_DEV_PUBLIC_DATA_ORIGIN: "http://example.com" },
    );

    expect(response?.status).toBe(500);
    await expect(response?.json()).resolves.toEqual({
      error: "Development public data origin is invalid",
    });
  });

  it("returns a bounded gateway error when production cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));

    const response = await proxyDevelopmentPublicDataGet(
      new Request("http://localhost:3101/api/predictions?species=all"),
      "/api/predictions",
      { NODE_ENV: "development", BOLETS_DEV_PUBLIC_DATA_ORIGIN: "https://bolets.app" },
    );

    expect(response?.status).toBe(502);
    await expect(response?.json()).resolves.toEqual({
      error: "Production public data is temporarily unavailable",
    });
  });
});
