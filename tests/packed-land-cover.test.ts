import { describe, expect, it } from "vitest";
import {
  packLandCoverFractions,
  unpackLandCoverSampleCount,
} from "../supabase/functions/_shared/land-cover";

describe("packed habitat cover", () => {
  it("preserves every 50 m sample count in one bigint", () => {
    const result = packLandCoverFractions([
      { code: 224, share: 0.72, habitat: ["matollars"] },
      { code: 228, share: 0.16, habitat: ["prats"] },
      { code: 226, share: 0.08, habitat: ["rouredes"] },
      { code: 222, share: 0.04, habitat: ["fagedes"] },
    ], "epsg25831:250:1791:18746");

    expect(result).not.toBeNull();
    expect(unpackLandCoverSampleCount(result!.packed, 224)).toBe(18);
    expect(unpackLandCoverSampleCount(result!.packed, 228)).toBe(4);
    expect(unpackLandCoverSampleCount(result!.packed, 226)).toBe(2);
    expect(unpackLandCoverSampleCount(result!.packed, 222)).toBe(1);
  });

  it("rejects fractions that were not produced by the canonical 25-sample grid", () => {
    expect(() => packLandCoverFractions([
      { code: 228, share: 0.2368, habitat: ["prats"] },
    ], "fine-sampled-cell")).toThrow("25-sample 50 m grid");
  });
});
