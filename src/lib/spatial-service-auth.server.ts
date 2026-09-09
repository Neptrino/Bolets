import "server-only";

import { serverSupabaseConfig, serviceSupabaseConfig } from "@/src/lib/supabase/config";

function developmentSpatialConfig(resolution: number) {
  if (process.env.NODE_ENV !== "development") return null;
  const detailed = resolution < 2500;
  const url = process.env.BOLETS_DEV_SPATIAL_DATA_URL?.trim();
  const key = (detailed
    ? process.env.BOLETS_DEV_SPATIAL_SERVICE_ROLE_KEY
    : process.env.BOLETS_DEV_SPATIAL_ANON_KEY)?.trim();
  // The public feed may be configured alone. Detailed reads then stay local.
  if (detailed && !key) return null;
  if (!url && !key) return null;
  if (!url || !key) throw new Error("Both development spatial URL and its credential are required");
  const origin = new URL(url);
  const localHttp = origin.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(origin.hostname);
  if ((!localHttp && origin.protocol !== "https:") || origin.username || origin.password ||
    origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("Development spatial URL must be an HTTPS or local HTTP origin");
  }
  // Only environmental GET callers use this configuration. Public requests
  // must stay anonymous; detailed application routes authorize the local
  // capability before using the separate server-only service credential.
  let role: unknown;
  try {
    role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
  } catch { /* Invalid credentials fail closed below. */ }
  if (role !== (detailed ? "service_role" : "anon")) {
    throw new Error(detailed
      ? "Detailed development spatial reads require a service-role key"
      : "Public development spatial reads require an anonymous key");
  }
  return { url: origin.origin, key };
}

/**
 * Detailed spatial reads leave the public Supabase surface entirely. Public
 * 2.5 km+ reads retain the anonymous credential and their shared caches;
 * server-only 1 km/250 m reads use the service role after the app route has
 * already authorized the short-lived contributor capability.
 */
export function spatialServiceConfig(resolution: number) {
  const development = developmentSpatialConfig(resolution);
  if (development) return development;
  if (resolution >= 2500) return serverSupabaseConfig();
  try {
    return serviceSupabaseConfig();
  } catch (error) {
    // Unit tests use a fake anonymous endpoint and never reach a deployed
    // Edge Function. Production must fail closed when the trusted credential
    // is absent.
    if (process.env.NODE_ENV === "test") return serverSupabaseConfig();
    throw error;
  }
}
