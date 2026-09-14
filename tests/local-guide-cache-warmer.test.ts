import { describe, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import { speciesLocationPages, locationPagePath } from "@/data/location-pages";
import { localGuideWarmTargets, warmLocalGuidePage } from "@/src/lib/local-guide-cache-warmer";
import { POST } from "@/app/api/internal/warm-local-guides/route";

describe("local-guide warming boundary", () => {
  it("warms only the actual published guide routes", () => {
    const targets = localGuideWarmTargets();
    expect(targets.length).toBeLessThan(512);
    expect(new Set(targets.map((target) => target.url)).size).toBe(targets.length);
    expect(targets.map((target) => target.url).sort())
      .toEqual(speciesLocationPages.map(locationPagePath).sort());
    expect(targets.some((target) => target.conditions)).toBe(true);
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


it("warms the RSC route over authenticated loopback and requires completed panels", async () => {
  vi.stubEnv("CACHE_WARM_SECRET", "test-secret");
  vi.stubEnv("PORT", "3000");
  const fetchMock = vi.fn().mockResolvedValue(new Response('<section data-local-evidence-state="available"></section><aside data-local-condition-state="available"></aside>'));
  vi.stubGlobal("fetch", fetchMock);
  try {
    const target = { url: "/zones/ripolles/camprodon/ceps", conditions: true };
    expect(await warmLocalGuidePage(target)).toEqual({ truncated: false });
    expect(fetchMock).toHaveBeenCalledWith(`http://127.0.0.1:3000${target.url}`, expect.objectContaining({
      headers: { Authorization: "Bearer test-secret", DNT: "1" }, cache: "no-store", redirect: "error",
    }));
    fetchMock.mockResolvedValueOnce(new Response('<section data-local-evidence-state="empty"></section><aside data-local-condition-state="unavailable"></aside>'));
    expect(await warmLocalGuidePage(target)).toEqual({ truncated: true });
    fetchMock.mockResolvedValueOnce(new Response('<section data-local-evidence-state="empty"></section>'));
    expect(await warmLocalGuidePage({ ...target, conditions: false })).toEqual({ truncated: false });
    fetchMock.mockResolvedValueOnce(new Response('failure', { status: 500 }));
    await expect(warmLocalGuidePage(target)).rejects.toThrow("500");
  } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
});
