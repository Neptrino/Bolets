import { describe, expect, it } from "vitest";
import { generateStaticParams } from "@/app/bolets/[slug]/page";
import { speciesProfiles } from "@/data/species";

describe("species routes", () => {
  it("generates one static route for every catalogue profile", () => {
    const params = generateStaticParams();

    expect(params).toHaveLength(speciesProfiles.length);
    expect(new Set(params.map(({ slug }) => slug)).size).toBe(speciesProfiles.length);
    expect(params.map(({ slug }) => slug)).toEqual(
      expect.arrayContaining(speciesProfiles.map(({ speciesId }) => speciesId)),
    );
  });
});
