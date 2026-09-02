import "server-only";

import { serverSupabaseConfig, serviceSupabaseConfig } from "@/src/lib/supabase/config";

/**
 * Detailed spatial reads leave the public Supabase surface entirely. Public
 * 2.5 km+ reads retain the anonymous credential and their shared caches;
 * server-only 1 km/250 m reads use the service role after the app route has
 * already authorized the short-lived contributor capability.
 */
export function spatialServiceConfig(resolution: number) {
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
