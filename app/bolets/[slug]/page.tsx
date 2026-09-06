import { SpeciesSearchSummary, hasSearchSummary } from "@/components/species-profile/search-summary";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Map } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { SpeciesCulinarySection } from "@/components/species-profile/culinary-section";
import { SpeciesDistributionSection } from "@/components/species-profile/distribution-section";
import { SpeciesEcologySection } from "@/components/species-profile/ecology-section";
import { SpeciesFieldCardSection } from "@/components/species-profile/field-card-section";
import { SpeciesIdentificationSection } from "@/components/species-profile/identification-section";
import { SpeciesHero } from "@/components/species-hero";
import { UmamiEventLink } from "@/components/umami-event-link";
import {
  catalogueSpecies,
  getCatalogueSpecies,
  getCatalogueSpeciesBySlug,
} from "@/data/catalogue";
import { getSpecies } from "@/data/species";
import { speciesSlugForId } from "@/data/species-slugs";
import { getSpanishSpeciesNames } from "@/data/species-common-names";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { isRegionId } from "@/data/regions";
import {
  SITE_URL,
  pageTitle,
  speciesDescription,
  speciesImage,
  speciesPath,
} from "@/src/lib/seo";
import { speciesMapHref } from "@/src/lib/species-map-pages";
import type { Month, RegionId, SeasonalActivity } from "@/src/lib/types";
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";

const sections = ["Identificació", "Cuina", "Ecologia", "Distribució", "Targeta de camp"];
const catalanList = new Intl.ListFormat("ca-ES", {
  style: "long",
  type: "conjunction",
});

const monthLabels: Record<Month, string> = {
  gen: "gen.",
  feb: "febr.",
  mar: "març",
  abr: "abr.",
  mai: "maig",
  jun: "juny",
  jul: "jul.",
  ago: "ag.",
  set: "set.",
  oct: "oct.",
  nov: "nov.",
  des: "des.",
};

function seasonSummary(seasonality: Record<Month, SeasonalActivity>) {
  const entries = Object.entries(seasonality) as [Month, SeasonalActivity][];
  const peakMonths = entries.filter(([, activity]) => activity === "peak").map(([month]) => monthLabels[month]);
  if (peakMonths.length > 0) return `Pic ${catalanList.format(peakMonths)}`;

  const activeMonths = entries.filter(([, activity]) => activity !== "inactive").map(([month]) => monthLabels[month]);
  if (activeMonths.length === 0) return "Sense temporada definida";
  if (activeMonths.length === 1) return activeMonths[0];
  return `${activeMonths[0]}–${activeMonths.at(-1)}`;
}

function detailId(label: string) {
  return label.toLocaleLowerCase("ca-ES").replaceAll(" ", "-");
}

export function generateStaticParams() {
  return catalogueSpecies.map((species) => ({
    slug: speciesSlugForId(species.speciesId),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const species = getCatalogueSpeciesBySlug(slug) ?? getCatalogueSpecies(slug);
  if (!species) notFound();

  const path = speciesPath(species);
  const description = species.seo?.description ?? speciesDescription(species);
  const image = speciesImage(species);
  const title = species.seo?.title ?? pageTitle(`${species.identity.commonName}: identificació, hàbitat i temporada`);
  const spanishNames = getSpanishSpeciesNames(species.speciesId);

  return {
    title,
    description,
    alternates: { canonical: path },
    keywords: [
      species.identity.commonName,
      species.identity.scientificName,
      ...species.identity.alternateNames,
      ...(spanishNames ? [spanishNames.primary, ...(spanishNames.alternatives ?? [])] : []),
      ...(species.seo?.keywords ?? []),
      `hàbitat ${species.identity.commonName}`,
      `temporada ${species.identity.commonName}`,
    ],
    openGraph: {
      type: "article",
      url: path,
      title,
      description,
      images: image
        ? [{ url: image, alt: species.media[0]?.alt ?? title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SpeciesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ region?: string }>;
}) {
  const { slug } = await params;
  const catalogueEntry = getCatalogueSpeciesBySlug(slug);
  if (!catalogueEntry) {
    const legacySpecies = getCatalogueSpecies(slug);
    if (!legacySpecies) notFound();

    const query = await searchParams;
    const canonicalQuery = new URLSearchParams();
    if (query.region) canonicalQuery.set("region", query.region);
    const suffix = canonicalQuery.size ? `?${canonicalQuery}` : "";
    permanentRedirect(`${speciesPath(legacySpecies)}${suffix}`);
  }

  const query = await searchParams;
  const species = catalogueEntry;
  const scoredSpecies = getSpecies(species.speciesId);
  const region: RegionId | null = scoredSpecies
    ? isRegionId(query.region)
      ? query.region
      : scoredSpecies.ecologicalConfig.regions[0] ?? "prepirineus"
    : null;
  const habitatLabel = "scope" in species
    ? species.ecology.habitats[0]
    : species.ecologicalConfig.habitat.forestTypes[0];
  const season = "scope" in species
    ? species.ecology.season
    : seasonSummary(species.ecologicalConfig.seasonality);
  const canonicalUrl = `${SITE_URL}${speciesPath(species)}`;
  const image = speciesImage(species);
  const spanishNames = getSpanishSpeciesNames(species.speciesId);
  const visibleSections = scoredSpecies
    ? sections
    : sections.filter((section) => section !== "Distribució");

  return (
    <section
      className="species-page compact-species-page"
      data-species-scope={scoredSpecies ? undefined : "reference-only"}
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "@id": `${canonicalUrl}#article`,
              headline: `${species.identity.commonName} (${species.identity.scientificName})`,
              description: speciesDescription(species),
              url: canonicalUrl,
              inLanguage: "ca",
              image,
              isPartOf: { "@id": `${SITE_URL}/#website` },
              publisher: { "@id": `${SITE_URL}/#organization` },
              ...editorialArticleFields(`species:${species.speciesId}`),
              about: {
                "@type": "Taxon",
                name: species.identity.scientificName,
                alternateName: [
                  species.identity.commonName,
                  ...species.identity.alternateNames,
                  ...(spanishNames ? [spanishNames.primary, ...(spanishNames.alternatives ?? [])] : []),
                ],
                taxonRank: "species",
                parentTaxon: {
                  "@type": "Taxon",
                  name: species.identity.genus,
                  taxonRank: "genus",
                },
              },
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${canonicalUrl}#breadcrumb`,
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Inici",
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Bolets",
                  item: `${SITE_URL}/bolets`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: species.identity.commonName,
                  item: canonicalUrl,
                },
              ],
            },
            ...(species.seo?.faqs?.length ? [{
              "@type": "FAQPage",
              "@id": `${canonicalUrl}#preguntes`,
              mainEntity: species.seo.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            }] : []),
          ],
        }}
      />
      <SpeciesHero
        species={species}
        habitatLabel={habitatLabel}
        altitudeLabel={scoredSpecies ? `${scoredSpecies.ecologicalConfig.habitat.altitude[0]}–${scoredSpecies.ecologicalConfig.habitat.altitude[1]} m` : undefined}
        seasonLabel={season}
      />

      <div className="page-width species-content">
        <aside className="species-aside" aria-label="Contingut de la fitxa">
          <p>CONTINGUT</p>
          {visibleSections.map((section) => (
            <a href={`#${detailId(section)}`} key={section}>
              {section}
            </a>
          ))}
          {scoredSpecies && region && (
            <UmamiEventLink
              href={speciesMapHref(scoredSpecies.speciesId, {
                region,
                mode: scoredSpecies.predictionMode === "habitat_only" ? "compatibility" : undefined,
              })}
              className="aside-map-link"
              analyticsEvent={UMAMI_EVENTS.speciesMapOpen}
            >
              <Map size={15} />
              {scoredSpecies.predictionMode === "habitat_only" ? "Mapa d’hàbitat" : "Mapa actual"}
            </UmamiEventLink>
          )}
        </aside>

        <div className="species-main">
          {scoredSpecies && hasSearchSummary(species.speciesId) && <SpeciesSearchSummary species={scoredSpecies} />}
          <SpeciesIdentificationSection species={species} />
          <SpeciesCulinarySection species={species} />
          <SpeciesEcologySection species={species} />
          {scoredSpecies && region && (
            <SpeciesDistributionSection
              autoGeolocate={!isRegionId(query.region)}
              region={region}
              species={scoredSpecies}
            />
          )}
          <SpeciesFieldCardSection species={species} sectionNumber={scoredSpecies ? "05" : "04"} />
          <EditorialAttribution
            contentId={`species:${species.speciesId}`}
            sources={[...species.references, officialSafetySource]}
            variant="compact"
          />
        </div>
      </div>
    </section>
  );
}
