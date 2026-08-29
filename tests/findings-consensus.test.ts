import { describe, expect, it } from "vitest";
import { calculateFindingConsensus } from "@/src/lib/findings/consensus";

describe("finding consensus", () => {
  it("does not open validation without a public photo", () => {
    expect(calculateFindingConsensus(["a", "a", "a"], 0)).toMatchObject({ status: "not_verifiable", speciesId: null });
  });

  it("requires three independent votes", () => {
    expect(calculateFindingConsensus(["rovello", "rovello"], 1)).toMatchObject({ status: "pending", speciesId: null, totalVotes: 2 });
  });

  it("supports the leading catalogue species at the 75 percent threshold", () => {
    expect(calculateFindingConsensus(["rovello", "rovello", "rovello", "cep"], 1)).toMatchObject({ status: "community_supported", speciesId: "rovello", leadingVotes: 3 });
  });

  it("marks a split identification as contested", () => {
    expect(calculateFindingConsensus(["rovello", "rovello", "cep", "cep"], 2)).toMatchObject({ status: "contested", speciesId: null });
  });
});
