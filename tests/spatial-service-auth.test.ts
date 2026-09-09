import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spatialServiceConfig } from "@/src/lib/spatial-service-auth.server";
import { serverSupabaseConfig, serviceSupabaseConfig } from "@/src/lib/supabase/config";

const keyFor = (role: string) => `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
const anonymousKey = keyFor("anon");

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_ANON_KEY", "local-anon");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "local-service");
  vi.stubEnv("BOLETS_DEV_SPATIAL_DATA_URL", "https://public-environment.example");
  vi.stubEnv("BOLETS_DEV_SPATIAL_ANON_KEY", anonymousKey);
  vi.stubEnv("BOLETS_DEV_SPATIAL_SERVICE_ROLE_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("development public spatial reads", () => {
  it("can opt detailed environmental GETs into a separate credential without changing auth/admin", () => {
    const serviceKey = keyFor("service_role");
    vi.stubEnv("BOLETS_DEV_SPATIAL_SERVICE_ROLE_KEY", serviceKey);
    for (const resolution of [250, 1000]) {
      expect(spatialServiceConfig(resolution)).toEqual({ url: "https://public-environment.example", key: serviceKey });
    }
    expect(spatialServiceConfig(2500).key).toBe(anonymousKey);
    expect(serverSupabaseConfig()).toEqual({ url: "http://127.0.0.1:54321", key: "local-anon" });
    expect(serviceSupabaseConfig()).toEqual({ url: "http://127.0.0.1:54321", key: "local-service" });
    vi.stubEnv("NODE_ENV", "production");
    expect(spatialServiceConfig(250)).toEqual(serviceSupabaseConfig());
  });

  it.each(["anon", "authenticated"])("rejects a %s credential for remote detailed reads", (role) => {
    vi.stubEnv("BOLETS_DEV_SPATIAL_SERVICE_ROLE_KEY", keyFor(role));
    expect(() => spatialServiceConfig(250)).toThrow("service-role key");
  });

  it("overrides only public spatial reads, keeping auth and detailed services local", () => {
    for (const resolution of [2500, 5000, 10000]) {
      expect(spatialServiceConfig(resolution)).toEqual({ url: "https://public-environment.example", key: anonymousKey });
    }
    for (const resolution of [250, 1000]) {
      expect(spatialServiceConfig(resolution)).toEqual(serviceSupabaseConfig());
    }
    expect(serverSupabaseConfig()).toEqual({ url: "http://127.0.0.1:54321", key: "local-anon" });
    expect(serviceSupabaseConfig()).toEqual({ url: "http://127.0.0.1:54321", key: "local-service" });
  });

  it.each(["production", "test"] as const)("ignores the override in %s", (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    expect(spatialServiceConfig(5000)).toEqual(serverSupabaseConfig());
  });

  it("uses local public data when the override is unconfigured", () => {
    vi.stubEnv("BOLETS_DEV_SPATIAL_DATA_URL", "");
    vi.stubEnv("BOLETS_DEV_SPATIAL_ANON_KEY", "");
    expect(spatialServiceConfig(5000)).toEqual(serverSupabaseConfig());
  });

  it.each(["service_role", "authenticated"])("rejects a %s key", (role) => {
    vi.stubEnv("BOLETS_DEV_SPATIAL_ANON_KEY", keyFor(role));
    expect(() => spatialServiceConfig(5000)).toThrow("anonymous key");
  });

  it.each(["", "malformed"])("rejects an absent or invalid key (%s)", (key) => {
    vi.stubEnv("BOLETS_DEV_SPATIAL_ANON_KEY", key);
    expect(() => spatialServiceConfig(5000)).toThrow();
  });

  it.each(["http://external.example", "https://user:password@external.example", "https://external.example/path", "https://external.example?query=1"])(
    "rejects unsafe origins (%s)", (url) => {
      vi.stubEnv("BOLETS_DEV_SPATIAL_DATA_URL", url);
      expect(() => spatialServiceConfig(5000)).toThrow();
    },
  );
});
