import { describe, expect, it } from "vitest";
import { summarizePublicFindings } from "@/src/lib/findings/public-summary";
import type { PublicFinding } from "@/src/lib/findings/types";

function finding(speciesId: string, speciesName: string, observedOn: string): PublicFinding {
  return {
    id: `${speciesId}-${observedOn}`,
    reportedSpeciesId: speciesId,
    reportedSpeciesName: speciesName,
    consensusSpeciesId: null,
    consensusSpeciesName: null,
    observedOn,
    cellId: "10km-1",
    cellBounds: { west: 1, south: 41, east: 1.1, north: 41.1 },
    alias: null,
    verificationStatus: "pending",
    voteCount: 0,
    consensusVoteCount: 0,
    photos: [],
  };
}

describe("public finding summary", () => {
  it("counts visible findings and species and keeps the latest date", () => {
    const summary = summarizePublicFindings([
      finding("boletus-edulis", "Cep", "2026-08-12"),
      finding("macrolepiota-procera", "Apagallums", "2026-08-29"),
      finding("boletus-edulis", "Cep", "2026-08-20"),
    ]);

    expect(summary.visibleFindingCount).toBe(3);
    expect(summary.visibleSpeciesCount).toBe(2);
    expect(summary.latestObservedOn).toBe("2026-08-29");
    expect(summary.species).toEqual([
      { speciesId: "boletus-edulis", speciesName: "Cep", findingCount: 2 },
      { speciesId: "macrolepiota-procera", speciesName: "Apagallums", findingCount: 1 },
    ]);
  });

  it("returns an empty, explicit summary when there are no public findings", () => {
    expect(summarizePublicFindings([])).toEqual({
      visibleFindingCount: 0,
      visibleSpeciesCount: 0,
      latestObservedOn: null,
      species: [],
    });
  });
});
