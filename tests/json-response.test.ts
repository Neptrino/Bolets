import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { jsonResponse } from "@/src/lib/json-response";

describe("map JSON responses", () => {
  const payload = { cells: Array.from({ length: 100 }, (_, index) => ({
    cellId: `cell-${index}`,
    score: index,
  })) };

  it("compresses material payloads when the client accepts gzip", async () => {
    const response = jsonResponse(
      new Request("http://localhost/api/predictions", {
        headers: { "Accept-Encoding": "br, gzip" },
      }),
      payload,
      { headers: { "Cache-Control": "public, max-age=60" } },
    );

    expect(response.headers.get("content-encoding")).toBe("gzip");
    expect(response.headers.get("vary")).toContain("Accept-Encoding");
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
    const decoded = gunzipSync(Buffer.from(await response.arrayBuffer()));
    expect(JSON.parse(decoded.toString())).toEqual(payload);
  });

  it("keeps an identity representation when gzip is rejected", async () => {
    const response = jsonResponse(
      new Request("http://localhost/api/predictions", {
        headers: { "Accept-Encoding": "gzip;q=0, br" },
      }),
      payload,
    );

    expect(response.headers.get("content-encoding")).toBeNull();
    await expect(response.json()).resolves.toEqual(payload);
  });
});
