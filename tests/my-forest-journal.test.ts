import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  journalSeasonWindow,
  summariseJournalSeason,
} from "@/src/lib/my-forest/journal";

const migration = readFileSync(
  "supabase/migrations/20260829182354_add_user_forest_preferences.sql",
  "utf8",
);

describe("private seasonal journal summary", () => {
  it("uses a July-to-June ecological season in Catalonia", () => {
    expect(journalSeasonWindow(new Date("2026-08-29T12:00:00Z"))).toEqual({
      startDate: "2026-07-01",
      endDate: "2027-07-01",
      seasonLabel: "2026–27",
    });
    expect(journalSeasonWindow(new Date("2027-02-01T12:00:00Z")).seasonLabel)
      .toBe("2026–27");
  });

  it("aggregates totals, species, visibility, top species and date bounds", () => {
    const summary = summariseJournalSeason([
      {
        species_id: "boletus-edulis",
        visibility: "public",
        finding_count: 3,
        first_observed_on: "2026-08-10",
        latest_observed_on: "2026-09-12",
      },
      {
        species_id: "boletus-edulis",
        visibility: "private",
        finding_count: 2,
        first_observed_on: "2026-08-20",
        latest_observed_on: "2026-10-01",
      },
      {
        species_id: "cantharellus-cibarius",
        visibility: "private",
        finding_count: 2,
        first_observed_on: "2026-07-22",
        latest_observed_on: "2026-07-30",
      },
    ], new Date("2026-11-01T12:00:00Z"));
    expect(summary).toMatchObject({
      total: 7,
      speciesCount: 2,
      publicCount: 3,
      privateCount: 4,
      firstObservedOn: "2026-07-22",
      latestObservedOn: "2026-10-01",
      topSpecies: { speciesId: "boletus-edulis", name: "Cep", count: 5 },
    });
  });

  it("returns a complete empty state", () => {
    expect(summariseJournalSeason([], new Date("2026-08-29T12:00:00Z")))
      .toMatchObject({ total: 0, speciesCount: 0, publicCount: 0, privateCount: 0, topSpecies: null });
  });

  it("queries only owner finding aggregates and never private detail tables", () => {
    const functionBody = migration.split("create or replace function public.read_owner_journal_season")[1]!;
    expect(functionBody).toContain("where findings.owner_id = p_owner_id");
    expect(functionBody).toContain("findings.publication_state <> 'hidden'");
    expect(functionBody).toContain("from public, anon, authenticated");
    expect(functionBody).toContain("to service_role");
    expect(functionBody).not.toContain("user_finding_private_details");
    expect(functionBody).not.toContain("user_finding_photos");
  });
});
