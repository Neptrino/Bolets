import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import SpeciesPage, { generateMetadata, generateStaticParams } from "@/app/bolets/[slug]/page";
import SpeciesIndexPage from "@/app/bolets/page";
import MushroomInfographicPage from "@/app/bolets/infografia/page";
import ComparisonLandingPage from "@/app/compare/[slug]/page";
import { buildSitemap as sitemap } from "@/app/sitemap";
import { catalogueSpecies } from "@/data/catalogue";
import { getReferenceSpecies, getReferenceSpeciesByScientificName, referenceSpeciesProfiles } from "@/data/reference-species";
import { getSpecies, speciesProfiles, speciesSelectItems } from "@/data/species";
import { speciesSlugForId } from "@/data/species-slugs";
import { globalCandidateSpecies } from "@/src/lib/global-predictions";
import { referenceSpeciesProfileSchema } from "@/src/lib/reference-species-schema";
import { speciesProfileSchema } from "@/src/lib/schema";
import { toSpeciesCardProfile } from "@/src/lib/species-card-profile";
import { toSpeciesFieldCardProfile } from "@/src/lib/species-field-card";
import { speciesInSeason } from "@/src/lib/species-collections";
import { speciesFieldCardPath, speciesPath } from "@/src/lib/seo";
import { SpeciesCard } from "@/components/species-card";

const speciesId = "hygrophoropsis-aurantiaca";
const slug = speciesSlugForId(speciesId);
const species = getReferenceSpecies(speciesId)!;

describe("descriptive catalogue species", () => {
  it.each([
    ["lycoperdon-perlatum", "pet-de-llop-perlat", "Pet de llop perlat", "edible_with_conditions"],
    ["calvatia-gigantea", "pet-de-llop-gegant", "Pet de llop gegant", "edible_with_conditions"],
    ["russula-cyanoxantha", "llora-aspra", "Llora aspra", "excellent_edible"],
    ["lactarius-chrysorrheus", "pinetell-bord", "Pinetell bord", "inedible"],
    ["lactarius-torminosus", "rovello-de-cabra", "Rovelló de cabra", "toxic"],
    ["ramaria-formosa", "peu-de-rata-bord", "Peu de rata bord", "toxic"],
    ["lactifluus-rugatus", "lleterola-roja", "Lleterola roja", "edible"],
    ["leccinellum-lepidum", "cigro-alzinenc", "Cigró", "edible"],
  ])("publishes %s with its own content while keeping it out of predictions", async (id, canonicalSlug, name, edibility) => {
    const profile = getReferenceSpecies(id)!;
    expect(referenceSpeciesProfileSchema.parse(profile).identity.edibility).toBe(edibility);
    expect(speciesSlugForId(id)).toBe(canonicalSlug);
    expect(catalogueSpecies).toContain(profile);
    expect(getReferenceSpeciesByScientificName(profile.identity.scientificName.toUpperCase())).toBe(profile);
    expect(getSpecies(id)).toBeUndefined();
    expect(speciesSelectItems.some(item => item.value === id)).toBe(false);
    expect(globalCandidateSpecies.some(item => item.speciesId === id)).toBe(false);
    expect(speciesInSeason("oct").some(item => item.speciesId === id)).toBe(false);
    const card = toSpeciesCardProfile(profile);
    expect(card.ecologicalConfig.habitat.altitude).toBeNull();
    expect(card.ecologicalConfig.seasonality).toBeNull();
    for (const asset of profile.media) {
      expect(asset.attribution).toBeTruthy();
      expect(asset.license).toMatch(/^CC BY/);
      expect(statSync(join(process.cwd(), "public", asset.localPath!)).size).toBeGreaterThan(0);
    }
    const params = Promise.resolve({ slug: canonicalSlug });
    expect((await generateMetadata({ params })).alternates?.canonical).toBe(`/bolets/${canonicalSlug}`);
    expect(generateStaticParams()).toContainEqual({ slug: canonicalSlug });
    const html = renderToStaticMarkup(await SpeciesPage({ params, searchParams: Promise.resolve({}) }));
    expect(html).toContain(`<h1>${name}</h1>`);
    expect(html).toContain(profile.morphology.cap);
    expect(html).toContain(profile.culinaryProfile.summary);
    expect(html).toContain(profile.culinaryProfile.cautions[0]);
    expect(html).toContain('"datePublished":"2026-09-02"');
    expect(html).toContain('data-species-scope="reference-only"');
    expect(html).toContain("Editorial, no micològica");
    expect(html).toContain('id="identificació" class="content-section"');
    expect(html).toContain('id="cuina" class="content-section culinary-section"');
    expect(html).toContain('id="ecologia" class="content-section ecology-section"');
    expect(html).not.toContain('id="distribució"');
    expect(html).toContain('data-mushroom-icon="cap"');
    expect(html).not.toContain('href="/map?');
    expect(html).not.toContain('href="/fals-rossinyol"');
    expect(html).not.toContain("No es recomana consumir-lo");
    expect(html).not.toContain("/_next/image");
    expect(sitemap().find(item => item.url.endsWith(`/bolets/${canonicalSlug}`))?.lastModified).toEqual(new Date("2026-09-02T00:00:00+02:00"));
    if (["lycoperdon-perlatum", "calvatia-gigantea"].includes(id)) {
      const relatedSlug = id === "lycoperdon-perlatum" ? "pet-de-llop-gegant" : "pet-de-llop-perlat";
      expect(html).toContain(`href="/bolets/${relatedSlug}"`);
      expect(html).toContain("Himeni");
      expect(profile.morphology.hymenium).toContain("No té làmines");
    }
  });

  it("validates sourced knowledge without accepting numeric model fields", () => {
    for (const profile of referenceSpeciesProfiles) expect(referenceSpeciesProfileSchema.safeParse(profile).success).toBe(true);
    expect(speciesProfileSchema.safeParse(species).success).toBe(false);
    expect(referenceSpeciesProfileSchema.safeParse({ ...species, modelConfig: getSpecies("cantharellus-cibarius")!.modelConfig }).success).toBe(false);
    expect(referenceSpeciesProfileSchema.safeParse({ ...species, ecology: { ...species.ecology, altitude: [0, 2000] } }).success).toBe(false);
    expect(species.identity.edibility).toBe("not_recommended");
    expect(species.culinaryProfile.kind).toBe("safety");
    expect(species.culinaryProfile.rating).toBe(0);
  });

  it("adds discoverability without changing model, map or monthly candidates", () => {
    expect(catalogueSpecies).toHaveLength(speciesProfiles.length + referenceSpeciesProfiles.length);
    expect(new Set(catalogueSpecies.map(item => item.speciesId)).size).toBe(catalogueSpecies.length);
    expect(catalogueSpecies).toContain(species);
    expect(getReferenceSpeciesByScientificName("  HYGROPHOROPSIS aurantiaca ")).toBe(species);
    expect(getReferenceSpeciesByScientificName("Unknown species")).toBeUndefined();
    expect(getSpecies(speciesId)).toBeUndefined();
    expect(speciesProfiles).toHaveLength(52);
    expect(speciesSelectItems.some(item => item.value === speciesId)).toBe(false);
    expect(globalCandidateSpecies.some(item => item.speciesId === speciesId)).toBe(false);
    expect(speciesInSeason("oct").some(item => item.speciesId === speciesId)).toBe(false);
  });

  it("uses compact cards with a sourced season instead of fabricated altitude or monthly intensity", () => {
    const card = toSpeciesCardProfile(species);
    expect(card.ecologicalConfig.habitat.altitude).toBeNull();
    expect(card.ecologicalConfig.seasonality).toBeNull();
    expect(card.seasonLabel).toBe("Tardor");
    const html = renderToStaticMarkup(createElement(SpeciesCard, { species: card, currentMonth: "oct" }));
    expect(html).toContain(`href="${speciesPath(species)}"`);
    expect(html).toContain("No recomanat");
    expect(html).toContain("Tardor");
    expect(html).not.toContain("Altitud");
    expect(html).not.toContain("card-season-month");
    expect(html).not.toContain("/_next/image");
    const catalogue = renderToStaticMarkup(createElement(SpeciesIndexPage));
    expect(catalogue).toContain(`"numberOfItems":${catalogueSpecies.length}`);
    expect(catalogue).toContain(`href="${speciesPath(species)}"`);
    expect(catalogue).toContain('href="/bolets/infografia"');
    expect(catalogue).toContain("catalogue-title-infographic-link");
    expect(catalogue).not.toContain("catalogue-infographic-entry");
    expect(catalogue).not.toContain('id="infografia"');

    const infographicPage = renderToStaticMarkup(createElement(MushroomInfographicPage));
    expect(infographicPage).toContain('id="infografia"');
    expect(infographicPage).toContain('/downloads/infografies/bolets-catalunya-infografia.png');
    expect(infographicPage).toContain(`Infografia vertical “Bolets de Catalunya” amb ${catalogueSpecies.length} espècies fotografiades`);
    expect(sitemap().some(item => item.url.endsWith("/bolets/infografia"))).toBe(true);

    const fieldCard = toSpeciesFieldCardProfile(species);
    expect(fieldCard.altitude).toBeNull();
    expect(fieldCard.seasonality).toBeNull();
    expect(fieldCard.bestMonths).toEqual([]);
    expect(fieldCard.bestMonthsLabel).toBe("Tardor");
    expect(fieldCard.habitatTypes).toEqual(["Pinedes i rouredes", "Boscos de coníferes"]);
  });

  it("keeps attributed source photographs locally, with no generated substitutes", () => {
    expect(species.media).toHaveLength(2);
    expect(species.media.filter(asset => asset.identificationReference)).toHaveLength(1);
    for (const asset of species.media) {
      expect(asset.sourceUrl).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\/File:/);
      expect(asset.license).toMatch(/^CC BY/);
      expect(asset.attribution.length).toBeGreaterThan(3);
      expect(asset.alt.length).toBeGreaterThan(30);
      const path = join(process.cwd(), "public", asset.localPath!);
      expect(existsSync(path)).toBe(true);
      expect(statSync(path).size).toBeGreaterThan(0);
    }
  });

  it("publishes the canonical route, Article and sitemap with the real publication date", async () => {
    const params = Promise.resolve({ slug });
    const metadata = await generateMetadata({ params });
    expect(metadata.alternates?.canonical).toBe(speciesPath(species));
    expect(metadata.robots).toBeUndefined();
    expect(metadata.description!.length).toBeLessThanOrEqual(155);
    expect(generateStaticParams()).toContainEqual({ slug });
    const html = renderToStaticMarkup(await SpeciesPage({ params, searchParams: Promise.resolve({}) }));
    expect(html).toContain('data-species-scope="reference-only"');
    expect(html).toContain('<h1>Fals rossinyol</h1>');
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"@type":"Taxon"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"datePublished":"2026-08-27"');
    expect(html).not.toContain('"reviewedBy"');
    expect(html).toContain("Editorial, no micològica");
    expect(html).not.toContain('href="/map?');
    expect(html).not.toContain("Mapa actual");
    expect(html).toContain('href="/fals-rossinyol"');
    expect(html).toContain('id="targeta-de-camp"');
    expect(html).toContain(`src="${speciesFieldCardPath(species)}"`);
    expect(html).toContain(`href="${speciesFieldCardPath(species)}" target="_blank"`);
    expect(html).toContain("1080 × 1350 px · Format 4:5");
    expect(html).not.toContain("Instagram");
    expect(html).toContain("Infografia vertical del Fals rossinyol amb fotografia, comestibilitat, trets d’identificació, temporada, hàbitat i advertiment de confusió.");
    expect(sitemap().find(item => item.url.endsWith(speciesPath(species)))).toMatchObject({
      lastModified: new Date("2026-08-27T00:00:00+02:00"),
      images: ["https://bolets.app/media/wikimedia/hygrophoropsis-aurantiaca.webp"],
    });
  });

  it("links the existing chanterelle profile to the descriptive lookalike without an unsupported comparator", async () => {
    const html = renderToStaticMarkup(await SpeciesPage({ params: Promise.resolve({ slug: "rossinyol" }), searchParams: Promise.resolve({}) }));
    expect(html).toContain('class="species-anatomy-guide-link"');
    expect(html).toContain("Guia de les parts");
    for (const icon of ["cap", "hymenium", "stem", "flesh-reaction"]) {
      expect(html).toContain(`data-mushroom-icon="${icon}"`);
    }
    expect(html).toContain(`href="${speciesPath(species)}"`);
    expect(html).not.toContain("right=hygrophoropsis-aurantiaca");
    expect(html).toContain('href="/fals-rossinyol"');
    expect(html).toContain("Guia del fals rossinyol");
  });

  it("publishes the dedicated rovelló and rovelló de cabra comparison", async () => {
    const html = renderToStaticMarkup(await ComparisonLandingPage({
      params: Promise.resolve({ slug: "rovello-vs-rovello-de-cabra" }),
    }));
    expect(html).toContain("Rovelló");
    expect(html).toContain("Rovelló de cabra");
    expect(html).toContain("làtex vermell vinós");
    expect(html).toContain("marge densament pelut");
    expect(html).toContain('href="/bolets/rovello"');
    expect(html).toContain('href="/bolets/rovello-de-cabra"');
    expect(html).not.toContain("Obrir el comparador complet");
    expect(html).toContain('"datePublished":"2026-09-02"');
  });
});
