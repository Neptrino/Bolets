import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import SpeciesPage, { generateMetadata, generateStaticParams } from "@/app/bolets/[slug]/page";
import SpeciesIndexPage from "@/app/bolets/page";
import sitemap from "@/app/sitemap";
import { catalogueSpecies } from "@/data/catalogue";
import { getReferenceSpecies, getReferenceSpeciesByScientificName, referenceSpeciesProfiles } from "@/data/reference-species";
import { getSpecies, speciesProfiles, speciesSelectItems } from "@/data/species";
import { globalCandidateSpecies } from "@/src/lib/global-predictions";
import { referenceSpeciesProfileSchema } from "@/src/lib/reference-species-schema";
import { speciesProfileSchema } from "@/src/lib/schema";
import { toSpeciesCardProfile } from "@/src/lib/species-card-profile";
import { speciesInSeason } from "@/src/lib/species-collections";
import { SpeciesCard } from "@/components/species-card";

const slug = "hygrophoropsis-aurantiaca";
const species = getReferenceSpecies(slug)!;

describe("descriptive catalogue species", () => {
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
    expect(getSpecies(slug)).toBeUndefined();
    expect(speciesProfiles).toHaveLength(52);
    expect(speciesSelectItems.some(item => item.value === slug)).toBe(false);
    expect(globalCandidateSpecies.some(item => item.speciesId === slug)).toBe(false);
    expect(speciesInSeason("oct").some(item => item.speciesId === slug)).toBe(false);
  });

  it("uses compact cards with a sourced season instead of fabricated altitude or monthly intensity", () => {
    const card = toSpeciesCardProfile(species);
    expect(card.ecologicalConfig.habitat.altitude).toBeNull();
    expect(card.ecologicalConfig.seasonality).toBeNull();
    expect(card.seasonLabel).toBe("Tardor");
    const html = renderToStaticMarkup(createElement(SpeciesCard, { species: card, currentMonth: "oct" }));
    expect(html).toContain('href="/bolets/hygrophoropsis-aurantiaca"');
    expect(html).toContain("No recomanat");
    expect(html).toContain("Tardor");
    expect(html).not.toContain("Altitud");
    expect(html).not.toContain("card-season-month");
    expect(html).not.toContain("/_next/image");
    const catalogue = renderToStaticMarkup(createElement(SpeciesIndexPage));
    expect(catalogue).toContain(`"numberOfItems":${catalogueSpecies.length}`);
    expect(catalogue).toContain('href="/bolets/hygrophoropsis-aurantiaca"');
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
    expect(metadata.alternates?.canonical).toBe(`/bolets/${slug}`);
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
    expect(html).toContain("sense revisió micològica independent");
    expect(html).not.toContain('href="/map?');
    expect(html).not.toContain("Mapa actual");
    expect(html).toContain('href="/fals-rossinyol"');
    expect(sitemap().find(item => item.url.endsWith(`/bolets/${slug}`))).toMatchObject({
      lastModified: new Date("2026-08-27T00:00:00+02:00"),
      images: ["https://bolets.app/media/wikimedia/hygrophoropsis-aurantiaca.webp"],
    });
  });

  it("links the existing chanterelle profile to the descriptive lookalike without an unsupported comparator", async () => {
    const html = renderToStaticMarkup(await SpeciesPage({ params: Promise.resolve({ slug: "cantharellus-cibarius" }), searchParams: Promise.resolve({}) }));
    expect(html).toContain('href="/bolets/hygrophoropsis-aurantiaca"');
    expect(html).not.toContain("right=hygrophoropsis-aurantiaca");
    expect(html).toContain('href="/fals-rossinyol"');
    expect(html).toContain("Guia del fals rossinyol");
  });
});
