import "server-only";

import { unstable_cache } from "next/cache";
import { z } from "zod";
import { readCurrentOverviewGeneration } from "@/src/lib/current-overview-generation-server";

export const TIMELINE_CACHE_SECONDS = 3600;
export const MAX_TIMELINE_FORECAST_AGE_MS = 36 * 60 * 60 * 1000;
const generationSchema = z.array(z.object({
  snapshot_date: z.string(),
  generated_at: z.string().datetime({ offset: true }),
  completed_at: z.string().datetime({ offset: true }),
})).max(1);

async function loadGeneration() {
  const baseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !key) return null;
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/rest/v1/weather_forecast_issues`);
  url.search = new URLSearchParams({
    select: "snapshot_date,generated_at,completed_at", completed_at: "not.is.null",
    order: "snapshot_date.desc", limit: "1",
  }).toString();
  try {
    const [observed, response] = await Promise.all([
      readCurrentOverviewGeneration(),
      fetch(url, { cache: "no-store", signal: AbortSignal.timeout(3000),
        headers: { apikey: key, Authorization: `Bearer ${key}` } }),
    ]);
    if (observed.startsWith("fallback:") || !response.ok) return null;
    const [forecast] = generationSchema.parse(await response.json());
    return { observed, forecast: forecast ?? null, storedAt: Date.now() };
  } catch { return null; }
}

let pending: ReturnType<typeof loadGeneration> | undefined;
function freshGeneration() {
  if (!pending) pending = loadGeneration().finally(() => { pending = undefined; });
  return pending;
}
const cachedGeneration = unstable_cache(async () => ({ value: await freshGeneration(), checkedAt: Date.now() }),
  ["prediction-timeline-generation-v1"], { revalidate: 30 });

/** Check publication cheaply; clock-dependent forecast eligibility is checked on every read. */
export async function readTimelineGeneration() {
  const cached = await cachedGeneration();
  const value = Date.now() - cached.checkedAt >= 30_000
    ? await freshGeneration() : cached.value;
  if (!value) return null;
  const forecast = value.forecast;
  const age = forecast ? Date.now() - Date.parse(forecast.generated_at) : NaN;
  const phase = !forecast ? "missing"
    : age < -15 * 60 * 1000 ? "future"
    : age > MAX_TIMELINE_FORECAST_AGE_MS ? "expired" : "valid";
  return `${value.observed}|${forecast ? `${forecast.snapshot_date}:${forecast.generated_at}:${forecast.completed_at}` : "none"}|${phase}`;
}
