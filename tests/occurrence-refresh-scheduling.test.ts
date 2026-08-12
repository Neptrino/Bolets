import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { speciesProfiles } from "@/data/species";

const functionSource = readFileSync(
  join(process.cwd(), "supabase", "functions", "refresh-species-occurrences", "index.ts"),
  "utf8",
);
const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260812160508_batch_species_occurrence_refresh.sql",
  ),
  "utf8",
);
const readerSource = readFileSync(
  join(process.cwd(), "supabase", "functions", "read-occurrence-support", "index.ts"),
  "utf8",
);

describe("species occurrence refresh scheduling", () => {
  it("covers the expanded catalogue with bounded, non-overlapping batches", () => {
    expect(functionSource).toContain("const DEFAULT_SPECIES_BATCH_SIZE = 7;");
    expect(functionSource).toContain("const MAX_SPECIES_BATCH_SIZE = 14;");
    expect(migration).toContain("'15,25,35,45 3 1 * *'");
    expect(migration).toContain('"maxSpecies":9');
    expect(migration).toContain("timeout_milliseconds := 120000");
    expect(9 * 4).toBeGreaterThanOrEqual(speciesProfiles.length);
    expect(speciesProfiles.length).toBeGreaterThan(14);
  });

  it("attempts untouched taxa before retrying failed taxa", () => {
    const attemptedOrder = functionSource.indexOf('.order("last_attempted_at"');
    const syncedOrder = functionSource.indexOf('.order("last_synced_at"');

    expect(attemptedOrder).toBeGreaterThan(-1);
    expect(syncedOrder).toBeGreaterThan(attemptedOrder);
  });

  it("does not present a never-synchronized taxon as a successful empty result", () => {
    expect(readerSource).toContain('.not("last_synced_at", "is", null)');
    expect(readerSource).toContain("Historical occurrence support has not been synchronized");
    expect(readerSource).toContain('"Cache-Control": "no-store"');
  });
});
