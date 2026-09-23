import "@/app/styles/comparison-guides.css";
import "@/app/styles/species-comparison.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightLeft, ArrowUpRight, CircleAlert, ScanLine } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { MediaImage } from "@/components/media-image";
import { ComparisonGuideList } from "@/components/comparison-guide-list";
import { SpeciesComparator } from "@/components/species-comparator";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { comparisonPages, comparisonPagesBySlug } from "@/data/comparison-pages";
import { getCatalogueSpecies } from "@/data/catalogue";
import { getSpecies } from "@/data/species";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";
import { SEASON_MONTHS } from "@/src/lib/seasonality";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, metaDescription, pageTitle, SITE_URL, speciesPath } from "@/src/lib/seo";
import type { CatalogueSpecies, SpeciesProfile } from "@/src/lib/types";
import { Notice } from "@/components/notice";
import { LOOKALIKE_GUIDE_PATH } from "@/src/lib/lookalike-guide";

export function generateStaticParams() {
  return comparisonPages.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = comparisonPagesBySlug[slug];
  if (!page) return {};

  return {
    title: pageTitle(page.shortTitle),
    description: metaDescription(page.metaDescription),
    keywords: page.searchTerms,
    alternates: { canonical: `/compare/${page.slug}` },
    openGraph: {
      url: `/compare/${page.slug}`,
      title: pageTitle(page.shortTitle),
      description: metaDescription(page.metaDescription),
      images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
    },
  };
}

function peakMonths(species: SpeciesProfile) {
  const labels = SEASON_MONTHS
    .filter(({ key }) => species.ecologicalConfig.seasonality[key] === "peak")
    .map(({ label }) => label);
  return labels.length ? labels.join(" i ") : "Sense pic definit";
}

function habitatLabel(species: CatalogueSpecies) {
  return "scope" in species
    ? species.ecology.habitats.join(", ")
    : species.ecologicalConfig.habitat.forestTypes.join(", ");
}

function seasonLabel(species: CatalogueSpecies) {
  return "scope" in species ? species.ecology.season : peakMonths(species);
}

function altitudeLabel(species: CatalogueSpecies) {
  return "scope" in species
    ? "No quantificada en aquesta fitxa descriptiva"
    : `${species.ecologicalConfig.habitat.altitude.join("–")} m`;
}

export default async function ComparisonLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = comparisonPagesBySlug[slug];
  if (!page) notFound();

  const left = getCatalogueSpecies(page.leftSpeciesId);
  const right = getCatalogueSpecies(page.rightSpeciesId);
  if (!left || !right) notFound();
  // Scored species get the interactive comparator; a descriptive-only species
  // has no numeric ecology to put in its matrix, so that pair keeps plain photos.
  const scoredLeft = getSpecies(page.leftSpeciesId);
  const scoredRight = getSpecies(page.rightSpeciesId);
  const leftImage = left.media.find((asset) => asset.identificationReference) ?? left.media[0];
  const rightImage = right.media.find((asset) => asset.identificationReference) ?? right.media[0];

  const rows = [
    ["Nom científic", left.identity.scientificName, right.identity.scientificName],
    ["Comestibilitat", getEdibilityPresentation(left.identity.edibility).label, getEdibilityPresentation(right.identity.edibility).label],
    ["Barret", left.morphology.cap, right.morphology.cap],
    ["Himeni", left.morphology.hymenium, right.morphology.hymenium],
    ["Carn i làtex", left.morphology.flesh, right.morphology.flesh],
    ["Hàbitat", habitatLabel(left), habitatLabel(right)],
    ["Temporada", seasonLabel(left), seasonLabel(right)],
    ["Altitud", altitudeLabel(left), altitudeLabel(right)],
  ];

  const writtenGuide = (
    <>
      <aside className="panel-dark comparison-answer">
        <CircleAlert size={22} aria-hidden="true" />
        <div><span>Diferència clau</span><strong>{page.decisiveDifference}</strong></div>
      </aside>

      {page.diagnosticTraits && page.diagnosticTraits.length > 0 && (
        <section className="comparison-facts" aria-labelledby="comparison-traits-title">
          <SectionHeader meta="Identificació" title="Trets decisius" titleId="comparison-traits-title" />
          <div className="card comparison-facts-table">
            <header><span>Tret</span><strong>{left.identity.commonName}</strong><strong>{right.identity.commonName}</strong></header>
            {page.diagnosticTraits.map((trait) => (
              <div key={trait.label}><span>{trait.label}</span><p>{trait.left}</p><p>{trait.right}</p></div>
            ))}
          </div>
        </section>
      )}

      {page.fieldChecks && page.fieldChecks.length > 0 && (
        <section className="seo-guide-section" aria-labelledby="comparison-checks-title">
          <SectionHeader meta="Al camp" title="Com comprovar-ho, per ordre" titleId="comparison-checks-title" />
          <ol className="step-cards step-cards-wide">
            {page.fieldChecks.map((check) => <li key={check}><p>{check}</p></li>)}
          </ol>
        </section>
      )}

    </>
  );

  return (
    <PageShell>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: page.title,
        url: absoluteUrl(`/compare/${page.slug}`),
        inLanguage: "ca",
        description: page.metaDescription,
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...editorialArticleFields(`compare:${page.slug}`),
        about: [
          { "@type": "Thing", name: left.identity.scientificName },
          { "@type": "Thing", name: right.identity.scientificName },
        ],
      }} />
      <Link href="/compare" className="text-link comparison-page-back">← Totes les comparacions</Link>
      <PageHeader
        eyebrow={<><ArrowRightLeft size={15} /> Guia comparativa</>}
        title={<>{left.identity.commonName} <PageTitleAccent>vs.</PageTitleAccent> {right.identity.commonName.toLocaleLowerCase("ca")}</>}
        description={page.introduction}
        actions={(
          <Link href={LOOKALIKE_GUIDE_PATH} className="button">
            <ScanLine size={18} aria-hidden="true" /> Bolets típics i confusions <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        )}
      />

      {scoredLeft && scoredRight ? (
        <SpeciesComparator
          left={scoredLeft}
          right={scoredRight}
          swappable={false}
          matrixHeading={page.habitatAndSeason ? {
            meta: "Hàbitat, clima i temporada",
            title: "Ajuda el lloc o el mes a distingir-los?",
            description: page.habitatAndSeason,
          } : undefined}
        >
          {writtenGuide}
        </SpeciesComparator>
      ) : (
        <>
          <div className="comparison-reference-images" aria-label="Fotografies de referència">
            {[{ species: left, image: leftImage }, { species: right, image: rightImage }].map((item) => (
              <figure key={item.species.speciesId}>
                <div className="comparison-reference-frame">
                  {item.image ? <MediaImage asset={item.image} alt={item.image.alt} fill sizes="(max-width: 700px) calc(100vw - 48px), 50vw" /> : <span>Sense fotografia de referència verificada</span>}
                </div>
                <figcaption><strong>{item.species.identity.commonName}</strong><em>{item.species.identity.scientificName}</em>{item.image && <a href={item.image.sourceUrl} target="_blank" rel="noreferrer">{item.image.attribution}</a>}</figcaption>
              </figure>
            ))}
          </div>
          {writtenGuide}
        </>
      )}

      {!(scoredLeft && scoredRight) && (
        <section className="comparison-facts" aria-labelledby="comparison-facts-title">
          <SectionHeader
            meta="Hàbitat i temporada"
            title={`Diferències entre ${left.identity.commonName.toLocaleLowerCase("ca")} i ${right.identity.commonName.toLocaleLowerCase("ca")}`}
            titleId="comparison-facts-title"
            description={page.habitatAndSeason}
          />
          <div className="card comparison-facts-table">
            <header><span>Criteri</span><strong>{left.identity.commonName}</strong><strong>{right.identity.commonName}</strong></header>
            {rows.map(([label, leftValue, rightValue]) => <div key={label}><span>{label}</span><p>{leftValue}</p><p>{rightValue}</p></div>)}
          </div>
        </section>
      )}

      <div className="comparison-actions">
        <Link href={speciesPath(left)} className="text-link">Guia principal: {left.identity.commonName} <ArrowUpRight size={16} /></Link>
        <Link href={speciesPath(right)} className="text-link">Guia principal: {right.identity.commonName} <ArrowUpRight size={16} /></Link>
      </div>

      <Notice icon={CircleAlert} title={page.confusionRisk ? "Què hi ha en joc" : "No decideixis el consum amb una taula."} tone="emergency" className="intent-safety-note comparison-warning">{page.confusionRisk ?? "La variació natural, l’edat i l’estat del bolet poden alterar-ne l’aspecte. Confirma qualsevol identificació amb una persona experta."}</Notice>
      <ComparisonGuideList currentSlug={page.slug} />
      <EditorialAttribution contentId={`compare:${page.slug}`} sources={[officialSafetySource, ...left.references, ...right.references]} />
    </PageShell>
  );
}
