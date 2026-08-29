import { describe, expect, it } from "vitest";
import {
  matchingOwnerFindingSpeciesIds,
  normalizeOwnerFindingSearch,
  ownerFindingsPage,
} from "@/src/lib/findings/owner-filter";

describe("owner findings pagination", () => {
  it("bounds invalid and excessive page numbers", () => {
    expect(ownerFindingsPage(null)).toBe(1);
    expect(ownerFindingsPage("-4")).toBe(1);
    expect(ownerFindingsPage("not-a-page")).toBe(1);
    expect(ownerFindingsPage("12")).toBe(12);
    expect(ownerFindingsPage("999999")).toBe(10_000);
  });

  it("matches common and scientific species names without requiring accents", () => {
    expect(normalizeOwnerFindingSearch("Tòfona")).toBe("tofona");
    expect(matchingOwnerFindingSpeciesIds("tofona")).toContain("tuber-melanosporum");
    expect(matchingOwnerFindingSpeciesIds("Boletus edulis")).toContain("boletus-edulis");
    expect(matchingOwnerFindingSpeciesIds("no-existeix")).toEqual([]);
    expect(matchingOwnerFindingSpeciesIds("   ")).toBeUndefined();
  });
});
