import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SpeciesFieldCardSection } from "@/components/species-profile/field-card-section";
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

  it("serves bounded, substantially smaller WebP previews while preserving the downloadable PNG", async () => {
    const load = (query = "") => fieldCardImage(
      new Request(`https://bolets.app/bolets/apagallums/targeta${query}`),
      { params: Promise.resolve({ slug: "apagallums" }) },
    );
    const original = Buffer.from(await (await load()).arrayBuffer());
    expect(await sharp(original).metadata()).toMatchObject({ format: "png", width: 1080, height: 1350 });
    for (const width of [384, 768]) {
      const response = await load(`?preview=${width}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/webp");
      expect(response.headers.get("cache-control")).toContain("max-age=3600");
      const bytes = Buffer.from(await response.arrayBuffer());
      expect(await sharp(bytes).metadata()).toMatchObject({ format: "webp", width, height: width * 1.25 });
      expect(bytes.byteLength).toBeLessThan(original.byteLength / 4);
      // Reading a different variant must not replace either cached response.
      expect(Buffer.from(await (await load(`?preview=${width}`)).arrayBuffer())).toEqual(bytes);
    }
    expect(Buffer.from(await (await load()).arrayBuffer())).toEqual(original);
    for (const query of ["?preview=", "?preview=9999", "?preview=../../escape"]) {
      expect((await load(query)).status).toBe(400);
    }
    const legacy = await fieldCardImage(
      new Request("https://bolets.app/bolets/macrolepiota-procera/targeta?preview=384"),
      { params: Promise.resolve({ slug: "macrolepiota-procera" }) },
    );
    expect(legacy.headers.get("location")).toBe("/bolets/apagallums/targeta?preview=384");
  }, 30_000);

  it("loads only responsive previews in the species page and links to the full card", () => {
    const species = getCatalogueSpeciesBySlug("apagallums")!;
    const html = renderToStaticMarkup(createElement(SpeciesFieldCardSection, { species }));
    expect(html).toContain('src="/bolets/apagallums/targeta?preview=384"');
    expect(html).toContain('srcSet="/bolets/apagallums/targeta?preview=384 384w, /bolets/apagallums/targeta?preview=768 768w"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('href="/bolets/apagallums/targeta"');
    expect(html).not.toContain('src="/bolets/apagallums/targeta"');
  });
});
