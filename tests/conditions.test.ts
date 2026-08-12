import { afterEach, describe, expect, it, vi } from "vitest";
import { getConditionSnapshot } from "@/src/lib/conditions";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("regional condition snapshots", () => {
  it("briefly caches the authenticated environmental read", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      regionId: "prepirineus",
      observedAt: "2026-08-12T07:15:00Z",
      source: ["test"],
      confidence: "limited",
      stale: false,
      unavailableFields: [],
      values: { temperatureC: 18 },
    })));

    await expect(getConditionSnapshot("prepirineus")).resolves.toMatchObject({
      regionId: "prepirineus",
      stale: false,
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://example.supabase.co/functions/v1/read-environment?region=prepirineus",
      expect.objectContaining({
        cache: "force-cache",
        next: { revalidate: 300 },
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
