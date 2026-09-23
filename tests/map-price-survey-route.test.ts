import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/map-price-survey/route";

describe("closed map-price survey endpoint", () => {
  it("refuses reads and submissions without creating or accepting responses", async () => {
    const request = new NextRequest("http://localhost:3101/api/map-price-survey", {
      method: "POST", headers: { origin: "http://localhost:3101", "content-type": "application/json" },
      body: JSON.stringify({ version: "map-price-v8", answer: "499" }),
    });

    for (const response of [await GET(new NextRequest("http://localhost:3101/api/map-price-survey")), await POST(request)]) {
      expect(response.status).toBe(410);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      await expect(response.json()).resolves.toEqual({ error: "L’enquesta de preu del mapa s’ha tancat." });
    }
  });
});
