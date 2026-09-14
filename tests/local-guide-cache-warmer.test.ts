import { describe, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import { speciesLocationPages, locationPagePath } from "@/data/location-pages";
import { localGuideWarmTargets } from "@/src/lib/local-guide-cache-warmer";
import { POST } from "@/app/api/internal/warm-local-guides/route";

describe("local-guide warming boundary", () => {
  it("warms only published guides with separate condition and habitat targets", () => {
    const targets = localGuideWarmTargets();
    expect(targets.length).toBeLessThan(512);
    expect(new Set(targets.map((target) => target.url)).size).toBe(targets.length);
    expect(targets.filter((target) => target.kind === "facts").map((target) => target.url).sort())
      .toEqual(speciesLocationPages.map((page) => `${locationPagePath(page)}#facts`).sort());
    expect(targets.some((target) => target.kind === "conditions")).toBe(true);
  });

  it("requires the separate warming credential and never caches authorization failures", async () => {
    vi.stubEnv("CACHE_WARM_SECRET", "test-secret");
    try {
      for (const authorization of [undefined, "Bearer wrong-secret"]) {
        const response = await POST(new Request("http://localhost/api/internal/warm-local-guides", {
          method: "POST", headers: authorization ? { authorization } : {},
        }));
        expect(response.status).toBe(404);
        expect(response.headers.get("cache-control")).toBe("no-store");
      }
    } finally { vi.unstubAllEnvs(); }
  });
});
