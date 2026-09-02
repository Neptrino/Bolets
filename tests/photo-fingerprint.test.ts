import { describe, expect, it } from "vitest";
import { hammingDistance } from "@/src/lib/findings/photo-fingerprint";

describe("finding photo perceptual hashes", () => {
  it("counts changed bits across a 64-bit hash", () => {
    expect(hammingDistance("0000000000000000", "0000000000000000")).toBe(0);
    expect(hammingDistance("0000000000000000", "000000000000000f")).toBe(4);
    expect(hammingDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
  });

  it("rejects malformed hashes instead of treating them as similar", () => {
    expect(hammingDistance("bad", "0000000000000000")).toBe(Number.POSITIVE_INFINITY);
  });
});
