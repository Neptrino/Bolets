import "@/app/styles/species-profile.css";
import "@/app/styles/species-field-card.css";
import { SpeciesContents } from "@/components/species-profile/species-contents";
import { ProfileSection } from "@/components/species-profile/profile-section";
import { speciesProfileSections } from "@/src/lib/species-headings";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Map } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { faqPageSchema } from "@/src/lib/faq-schema";
import { SpeciesCulinarySection } from "@/components/species-profile/culinary-section";
import { SpeciesDistributionSection } from "@/components/species-profile/distribution-section";
import { SpeciesEcologySection } from "@/components/species-profile/ecology-section";
import { SpeciesFaqSection } from "@/components/species-profile/faq-section";
import { SpeciesFieldCardSection } from "@/components/species-profile/field-card-section";
import { SpeciesIdentificationSection } from "@/components/species-profile/identification-section";
import { SpeciesSectionTracker } from "@/components/species-profile/section-tracker";
import { SpeciesHero } from "@/components/species-hero";
import { UmamiEventLink } from "@/components/umami-event-link";
import {
  catalogueSpecies,
  getCatalogueSpecies,
  getCatalogueSpeciesBySlug,
} from "@/data/catalogue";
import { getSpecies } from "@/data/species";
import { speciesSlugForId } from "@/data/species-slugs";
import { speciesSameAs } from "@/data/species-identifiers";
import { getSpanishSpeciesNames } from "@/data/species-common-names";
import { editorialArticleFields, getEditorialMetadata, officialSafetySource } from "@/data/editorial";
import { isRegionId } from "@/data/regions";
import {
  SITE_URL,
  speciesImage,
  speciesPath,
} from "@/src/lib/seo";
import { speciesMapHref } from "@/src/lib/species-map-pages";
import { speciesFaqs, speciesLead, speciesMetaDescription, speciesPageTitle } from "@/src/lib/species-summary";
import type { Month, RegionId, SeasonalActivity } from "@/src/lib/types";
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";
import { breadcrumbSchema } from "@/src/lib/breadcrumb-schema";

const catalanList = new Intl.ListFormat("ca-ES", {
  style: "long",
  type: "conjunction",
});

const catalanDate = new Intl.DateTimeFormat("ca-ES", { dateStyle: "long", timeZone: "Europe/Madrid" });

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
  const spanishNames = getSpanishSpeciesNames(species.speciesId);
  const description = species.seo?.description ?? speciesMetaDescription(species, spanishNames);
  const image = speciesImage(species);
  const title = speciesPageTitle(species);

  return {
    title,
    description,
    alternates: { canonical: path },
    keywords: [
      species.identity.commonName,
      species.identity.scientificName,
      ...species.identity.alternateNames,
      ...(spanishNames ? [spanishNames.primary, ...(spanishNames.alternatives ?? [])] : []),
      `${species.identity.commonName} en castellà`,
      `${species.identity.commonName} en castellano`,
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
  const habitats = "scope" in species
    ? species.ecology.habitats
    : species.ecologicalConfig.habitat.forestTypes;
  const habitatLabel = habitats.length > 1
    ? `${habitats[0]} i ${habitats.length - 1} més`
    : habitats[0];
  const season = "scope" in species
    ? species.ecology.season
    : seasonSummary(species.ecologicalConfig.seasonality);
  const canonicalUrl = `${SITE_URL}${speciesPath(species)}`;
  const image = speciesImage(species);
  const spanishNames = getSpanishSpeciesNames(species.speciesId);
  const lead = speciesLead(species, spanishNames);
  const description = species.seo?.description ?? speciesMetaDescription(species, spanishNames);
  const faqs = speciesFaqs(species, spanishNames);
  const editorial = getEditorialMetadata(`species:${species.speciesId}`);
  const updatedLabel = catalanDate.format(new Date(`${editorial.updatedAt}T12:00:00+02:00`));
  const primaryLookalike = species.similarSpecies.find((item) => item.warning || item.edibility.includes("toxic"))
    ?? species.similarSpecies[0];
  const visibleSections = speciesProfileSections(species);

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
              description,
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
                sameAs: speciesSameAs(species.speciesId),
                parentTaxon: {
                  "@type": "Taxon",
                  name: species.identity.genus,
                  taxonRank: "genus",
                },
              },
            },
            breadcrumbSchema([{ name: "Bolets", url: `${SITE_URL}/bolets` }, { name: species.identity.commonName, url: canonicalUrl }], `${canonicalUrl}#breadcrumb`),
            ...(faqs.length > 0 ? [faqPageSchema(faqs, `${canonicalUrl}#preguntes`)] : []),
          ],
        }}
      />
      <SpeciesHero
        species={species}
        habitatLabel={habitatLabel}
        altitudeLabel={scoredSpecies ? `${scoredSpecies.ecologicalConfig.habitat.altitude[0]}–${scoredSpecies.ecologicalConfig.habitat.altitude[1]} m` : undefined}
        seasonLabel={season}
        lookalike={primaryLookalike ? { name: primaryLookalike.commonName, edibility: primaryLookalike.edibility, href: "#confusions" } : undefined}
        lead={lead}
        spanishNames={spanishNames ? [spanishNames.primary, ...(spanishNames.alternatives ?? [])] : undefined}
        updatedLabel={updatedLabel}
      />

      <div className="page-width species-content">
        <SpeciesContents>
          <p>CONTINGUT</p>
          {visibleSections.map((section) => (
            <a href={`#${section.id}`} key={section.id}>
              <span className="species-nav-number" aria-hidden="true">{section.number}</span>
              {section.label}
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
        </SpeciesContents>

        <div className="species-main">
          <SpeciesIdentificationSection species={species} />
          <SpeciesCulinarySection species={species} />
          <SpeciesEcologySection species={species} />
          {scoredSpecies && region && <SpeciesDistributionSection region={region} species={scoredSpecies} />}
          <SpeciesFaqSection species={species} faqs={faqs} />
          <SpeciesFieldCardSection species={species} />
          <ProfileSection species={species} id="fonts" eyebrow="Referències" title="Fonts i autoria">
          <EditorialAttribution
            contentId={`species:${species.speciesId}`}
            sources={[...species.references, officialSafetySource]}
            variant="compact"
          />
          </ProfileSection>
          <SpeciesSectionTracker
            navSelector=".species-aside"
            sections={[
              { id: "identificació", event: UMAMI_EVENTS.speciesSectionIdentificacio },
              { id: "confusions", event: UMAMI_EVENTS.speciesSectionConfusions },
              { id: "cuina", event: UMAMI_EVENTS.speciesSectionCuina },
              { id: "ecologia", event: UMAMI_EVENTS.speciesSectionEcologia },
              { id: "distribució", event: UMAMI_EVENTS.speciesSectionDistribucio },
              { id: "targeta-de-camp", event: UMAMI_EVENTS.speciesSectionTargeta },
              { id: "fonts", event: UMAMI_EVENTS.speciesSectionFonts },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
