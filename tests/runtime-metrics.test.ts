import { afterEach, describe, expect, it, vi } from "vitest";
import { runtimeMetricsPrometheus, startRuntimeMetrics } from "@/src/lib/runtime-metrics";
import { GET } from "@/app/api/internal/runtime-metrics/route";
import { isMapWarmRequestAuthorized } from "@/src/lib/map-cache-warmer";
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
afterEach(() => { vi.unstubAllEnvs(); });

describe("private runtime telemetry", () => {
  it("does not start sampling without explicit runtime enablement", () => {
    vi.stubEnv("BOLETS_RUNTIME_METRICS", "0");
    startRuntimeMetrics();
    expect(runtimeMetricsPrometheus()).toBe("");
  });

  it("exposes only finite aggregate metrics through authenticated ingress", async () => {
    vi.stubEnv("BOLETS_RUNTIME_METRICS", "1");
    vi.stubEnv("STATUS_INTERNAL_TOKEN", "private-test-token");
    startRuntimeMetrics();
    startRuntimeMetrics();
    const denied = await GET(new Request("https://bolets.app/api/internal/runtime-metrics"));
    expect(denied.status).toBe(404);
    const allowed = await GET(new Request("https://bolets.app/api/internal/runtime-metrics", {
      headers: { Authorization: "Bearer private-test-token" },
    }));
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("Cache-Control")).toBe("no-store");
    const text = await allowed.text();
    expect(text).toContain("bolets_event_loop_delay_p99_seconds");
    expect(text).toContain("bolets_process_resident_memory_bytes");
    expect(text).not.toMatch(/NaN|Infinity|private-test-token|bolets\.app/);
    expect(text.split("\n").filter((line) => line && !line.startsWith("#"))).toHaveLength(7);
  });

  it("keeps warming authorization independent from metrics credentials", () => {
    vi.stubEnv("STATUS_INTERNAL_TOKEN", "metrics-token");
    vi.stubEnv("CACHE_WARM_SECRET", "warming-token");
    expect(isMapWarmRequestAuthorized(new Headers({ Authorization: "Bearer metrics-token" }))).toBe(false);
    expect(isMapWarmRequestAuthorized(new Headers({ Authorization: "Bearer warming-token" }))).toBe(true);
    vi.stubEnv("CACHE_WARM_SECRET", "");
    expect(isMapWarmRequestAuthorized(new Headers({ Authorization: "Bearer warming-token" }))).toBe(false);
  });
});
