import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const worker = readFileSync(
  join(process.cwd(), "supabase", "functions", "backfill-spatial-history", "index.ts"),
  "utf8",
);

describe("spatial hydrothermal history backfill", () => {
  it("is authenticated, bounded to recent past dates, and resumable", () => {
    expect(worker).toContain("verifyIngestionRequest(request, supabase)");
    expect(worker).toContain("MAX_BACKFILL_AGE_DAYS = 7");
    expect(worker).toContain("target < today");
    expect(worker).toContain("spatial-history-${profile}-${snapshotDate}");
    expect(worker).toContain("COMPLETE_CURSOR");
  });

  it("rebuilds every trailing field at the original provider-valid time", () => {
    expect(worker).toContain("snapshot.values.weatherObservedAt");
    expect(worker).toContain("normalizeOpenMeteoAt(locations[index], originalTargetAt, profile)");
    expect(worker).toContain("weatherObservedAt: originalTargetAt");
    expect(worker).toContain("configureOpenMeteoHistoricalRequest");
  });

  it("fails a batch closed instead of publishing shortened historical windows", () => {
    expect(worker).toMatch(/if \(normalized\.unavailableFields\.length\)/);
    expect(worker).toContain("Historical ${profile} inputs are incomplete");
    expect(worker).toContain("upsert(rows, { onConflict: \"point_id,snapshot_date\" })");
  });

  it("keeps snapshot timing and source provenance while removing obsolete fields", () => {
    expect(worker).toContain("observed_at: snapshot.observed_at");
    expect(worker).toContain("sources: snapshot.sources");
    expect(worker).toContain("removeLegacyAtmosphereValues(snapshot.values)");
    expect(worker).toContain("run_id: runId");
  });
});
