import { describe, expect, it } from "vitest";
import { generateStaticParams } from "@/app/bolets/[slug]/page";
import { catalogueSpecies } from "@/data/catalogue";

describe("species routes", () => {
  it("generates one static route for every catalogue profile", () => {
    const params = generateStaticParams();

    expect(params).toHaveLength(catalogueSpecies.length);
    expect(new Set(params.map(({ slug }) => slug)).size).toBe(catalogueSpecies.length);
    expect(params.map(({ slug }) => slug)).toEqual(
      expect.arrayContaining(catalogueSpecies.map(({ speciesId }) => speciesId)),
    );
  });
});
