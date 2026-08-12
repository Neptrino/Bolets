import { describe, expect, it } from "vitest";
import { packLandCoverFractions, summarizeLandCoverCounts } from "../scripts/lib/land-cover.mjs";

describe("static land-cover sampling", () => {
  it("preserves every sampled compatible cover fraction instead of only the dominant class", () => {
    const result = summarizeLandCoverCounts(new Map([
      [221, 9],
      [228, 7],
      [223, 4],
    ]), 25);

    expect(result).toMatchObject({ code: 221, share: 0.36, naturalShare: 0.8 });
    expect(result.habitat).toEqual(expect.arrayContaining(["pinedes", "prats", "alzinars"]));
    expect(result.fractions).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 228, share: 0.28, habitat: expect.arrayContaining(["prats"]) }),
      expect.objectContaining({ code: 223, share: 0.16, habitat: expect.arrayContaining(["alzinars"]) }),
    ]));
  });

  it("keeps a small matching fraction instead of applying the old 40% gate", () => {
    expect(summarizeLandCoverCounts(new Map([[228, 1]]), 25)).toMatchObject({
      share: 0.04,
      naturalShare: 0.04,
    });
    expect(summarizeLandCoverCounts(new Map(), 25)).toBeUndefined();
  });

  it("packs the canonical sample counts without rounding away small covers", () => {
    const packed = packLandCoverFractions([
      { code: 224, share: 0.72 },
      { code: 228, share: 0.16 },
      { code: 226, share: 0.08 },
      { code: 222, share: 0.04 },
    ]);

    expect(packed).toBe("137506652192");
  });
});
