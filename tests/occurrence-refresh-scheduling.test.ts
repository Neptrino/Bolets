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
    "20260813141000_register_expanded_species_occurrences.sql",
  ),
  "utf8",
);
const readerSource = readFileSync(
  join(process.cwd(), "supabase", "functions", "read-occurrence-support", "index.ts"),
  "utf8",
);

const expandedTaxa = [
  ["hygrophorus-marzuolus", "Hygrophorus marzuolus"],
  ["tricholoma-portentosum", "Tricholoma portentosum"],
  ["russula-virescens", "Russula virescens"],
  ["cyclocybe-cylindracea", "Cyclocybe cylindracea"],
  ["coprinus-comatus", "Coprinus comatus"],
  ["suillus-granulatus", "Suillus granulatus"],
  ["pleurotus-eryngii", "Pleurotus eryngii"],
  ["lepiota-brunneoincarnata", "Lepiota brunneoincarnata"],
  ["galerina-marginata", "Galerina marginata"],
  ["cortinarius-orellanus", "Cortinarius orellanus"],
  ["gyromitra-esculenta", "Gyromitra esculenta"],
  ["amanita-pantherina", "Amanita pantherina"],
  ["amanita-virosa", "Amanita virosa"],
  ["amanita-verna", "Amanita verna"],
  ["tricholoma-pardinum", "Tricholoma pardinum"],
  ["entoloma-sinuatum", "Entoloma sinuatum"],
  ["inocybe-erubescens", "Inosperma erubescens"],
  ["clitocybe-rivulosa", "Clitocybe rivulosa"],
  ["paxillus-involutus", "Paxillus involutus"],
] as const;

describe("species occurrence refresh scheduling", () => {
  it("covers the expanded catalogue with bounded, non-overlapping batches", () => {
    expect(functionSource).toContain("const DEFAULT_SPECIES_BATCH_SIZE = 7;");
    expect(functionSource).toContain("const MAX_SPECIES_BATCH_SIZE = 14;");
    expect(migration).toContain("'15,25,35,45,55 3 1 * *'");
    expect(migration).toContain("'5,15 4 1 * *'");
    expect(migration.match(/"maxSpecies":9/g)).toHaveLength(2);
    expect(migration.match(/timeout_milliseconds := 120000/g)).toHaveLength(2);
    expect(migration).toContain("'refresh-species-occurrences-monthly-tail'");
    expect(9 * 7).toBeGreaterThanOrEqual(speciesProfiles.length);
    expect(speciesProfiles.length).toBeGreaterThan(14);
  });

  it("registers exactly the 19 expanded catalogue taxa", () => {
    expect(expandedTaxa).toHaveLength(19);
    expect(
      migration.match(/\('8583f4f6-f762-11e1-a439-00145eb45e9a', '[a-z0-9-]+', '[A-Z][^']+'\)/g),
    ).toHaveLength(expandedTaxa.length);

    for (const [speciesId, scientificName] of expandedTaxa) {
      expect(migration).toContain(`'${speciesId}', '${scientificName}'`);
    }
    expect(migration).toContain("profile uses the current Kew name 'Collybia rivulosa'");
    expect(migration).toContain("on conflict (dataset_key, species_id) do update");
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
