import { describe, expect, it } from "vitest";
import { generateStaticParams } from "@/app/bolets/[slug]/page";
import { GET as fieldCardImage } from "@/app/bolets/[slug]/targeta/route";
import { catalogueSpecies, getCatalogueSpeciesBySlug } from "@/data/catalogue";
import { speciesSlugForId, speciesSlugs } from "@/data/species-slugs";

describe("species routes", () => {
  it("generates one static route for every catalogue profile", () => {
    const params = generateStaticParams();

    expect(params).toHaveLength(catalogueSpecies.length);
    expect(new Set(params.map(({ slug }) => slug)).size).toBe(catalogueSpecies.length);
    expect(params.map(({ slug }) => slug)).toEqual(
      expect.arrayContaining(
        catalogueSpecies.map(({ speciesId }) => speciesSlugForId(speciesId)),
      ),
    );
  });

  it("keeps one explicit, unique Catalan slug for every catalogue species", () => {
    expect(Object.keys(speciesSlugs).sort()).toEqual(
      catalogueSpecies.map(({ speciesId }) => speciesId).sort(),
    );

    const slugs = Object.values(speciesSlugs);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true);
    expect(speciesSlugForId("boletus-edulis")).toBe("cep");
    expect(speciesSlugForId("lactarius-sanguifluus")).toBe("rovello");
    expect(getCatalogueSpeciesBySlug("cep")?.speciesId).toBe("boletus-edulis");
  });

  it("redirects legacy field cards, renders the canonical PNG and rejects unknown species", async () => {
    const legacy = await fieldCardImage(
      new Request("https://bolets.app/bolets/boletus-edulis/targeta"),
      { params: Promise.resolve({ slug: "boletus-edulis" }) },
    );
    expect(legacy.status).toBe(308);
    expect(legacy.headers.get("location")).toBe("/bolets/cep/targeta");

    const response = await fieldCardImage(
      new Request("https://bolets.app/bolets/cep/targeta"),
      { params: Promise.resolve({ slug: "cep" }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(10_000);

    const missing = await fieldCardImage(
      new Request("https://bolets.app/bolets/no-existeix/targeta"),
      { params: Promise.resolve({ slug: "no-existeix" }) },
    );
    expect(missing.status).toBe(404);
  });
});
