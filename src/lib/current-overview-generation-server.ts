import "server-only";

import { cache } from "react";

type ConditionCursor = {
  pipeline: string;
  snapshot_date: string;
  updated_at: string;
};

const CONDITION_PIPELINES = [
  "spatial-condition-coarse",
  "spatial-condition-territorial",
] as const;

function fallbackGenerationKey() {
  // A transient cursor-read failure must not pin an old overview for twelve
  // hours. The five-minute bucket keeps the fallback bounded while avoiding a
  // cold overview on every request during a short database interruption.
  return `fallback:${Math.floor(Date.now() / (5 * 60 * 1_000))}`;
}

const readConditionCursors = cache(async (): Promise<ConditionCursor[] | null> => {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceRole) return null;

  try {
    const url = new URL(`${baseUrl.replace(/\/$/, "")}/rest/v1/pipeline_cursors`);
    url.searchParams.set("select", "pipeline,snapshot_date,updated_at");
    url.searchParams.set("pipeline", `in.(${CONDITION_PIPELINES.join(",")})`);
    url.searchParams.set("last_cell_id", "eq.__complete__");

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return null;

    const rows = await response.json() as ConditionCursor[];
    const cursors = rows
      .filter((row) => CONDITION_PIPELINES.includes(
        row.pipeline as (typeof CONDITION_PIPELINES)[number],
      ))
      .sort((left, right) => left.pipeline.localeCompare(right.pipeline));

    return cursors.length === CONDITION_PIPELINES.length ? cursors : null;
  } catch {
    return null;
  }
});

/**
 * Read the two publication generations outside the expensive overview cache.
 * unstable_cache includes function arguments in its key, so a completed
 * coarse or territorial rebuild immediately selects a fresh overview entry.
 */
export const readCurrentOverviewGeneration = cache(async () => {
  const cursors = await readConditionCursors();
  if (!cursors) return fallbackGenerationKey();

  return cursors
    .map((cursor) => `${cursor.pipeline}:${cursor.snapshot_date}:${cursor.updated_at}`)
    .join("|");
});

export const readCurrentOverviewLastModified = cache(async () => {
  const cursors = await readConditionCursors();
  if (!cursors) return null;

  const timestamps = cursors
    .map((cursor) => new Date(cursor.updated_at))
    .filter((value) => !Number.isNaN(value.getTime()));

  return timestamps.length > 0
    ? new Date(Math.max(...timestamps.map((value) => value.getTime())))
    : null;
});
