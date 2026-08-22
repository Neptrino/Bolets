import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightLeft, ArrowUpRight, CircleAlert } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { MediaImage } from "@/components/media-image";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { comparisonPages, comparisonPagesBySlug } from "@/data/comparison-pages";
import { getSpecies } from "@/data/species";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";
import { SEASON_MONTHS } from "@/src/lib/seasonality";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, metaDescription, pageTitle, SITE_URL, speciesPath } from "@/src/lib/seo";
import type { SpeciesProfile } from "@/src/lib/types";

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

export default async function ComparisonLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = comparisonPagesBySlug[slug];
  if (!page) notFound();

  const left = getSpecies(page.leftSpeciesId);
  const right = getSpecies(page.rightSpeciesId);
  if (!left || !right) notFound();
  const leftImage = left.media.find((asset) => asset.identificationReference) ?? left.media[0];
  const rightImage = right.media.find((asset) => asset.identificationReference) ?? right.media[0];

  const rows = [
    ["Nom científic", left.identity.scientificName, right.identity.scientificName],
    ["Comestibilitat", getEdibilityPresentation(left.identity.edibility).label, getEdibilityPresentation(right.identity.edibility).label],
    ["Barret", left.morphology.cap, right.morphology.cap],
    ["Himeni", left.morphology.hymenium, right.morphology.hymenium],
    ["Carn i làtex", left.morphology.flesh, right.morphology.flesh],
    ["Hàbitat", left.ecologicalConfig.habitat.forestTypes.join(", "), right.ecologicalConfig.habitat.forestTypes.join(", ")],
    ["Pic de temporada", peakMonths(left), peakMonths(right)],
    ["Altitud", `${left.ecologicalConfig.habitat.altitude.join("–")} m`, `${right.ecologicalConfig.habitat.altitude.join("–")} m`],
  ];

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
      />

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

      <aside className="comparison-answer">
        <CircleAlert size={22} aria-hidden="true" />
        <div><span>Diferència clau</span><strong>{page.decisiveDifference}</strong></div>
      </aside>

      {page.diagnosticTraits && page.diagnosticTraits.length > 0 && (
        <section className="comparison-facts" aria-labelledby="comparison-traits-title">
          <h2 id="comparison-traits-title">Trets decisius</h2>
          <div className="comparison-facts-table">
            <header><span>Tret</span><strong>{left.identity.commonName}</strong><strong>{right.identity.commonName}</strong></header>
            {page.diagnosticTraits.map((trait) => (
              <div key={trait.label}><span>{trait.label}</span><p>{trait.left}</p><p>{trait.right}</p></div>
            ))}
          </div>
        </section>
      )}

      {page.fieldChecks && page.fieldChecks.length > 0 && (
        <section className="seo-guide-section" aria-labelledby="comparison-checks-title">
          <p className="eyebrow">Al camp</p>
          <h2 id="comparison-checks-title">Com comprovar-ho, per ordre</h2>
          <ol className="comparison-field-checks">
            {page.fieldChecks.map((check) => <li key={check}>{check}</li>)}
          </ol>
        </section>
      )}

      {page.habitatAndSeason && (
        <section className="seo-guide-section" aria-labelledby="comparison-habitat-title">
          <p className="eyebrow">Hàbitat i temporada</p>
          <h2 id="comparison-habitat-title">Ajuda el lloc o el mes a distingir-los?</h2>
          <p>{page.habitatAndSeason}</p>
        </section>
      )}

      <section className="comparison-facts" aria-labelledby="comparison-facts-title">
        <h2 id="comparison-facts-title">Diferències entre {left.identity.commonName.toLocaleLowerCase("ca")} i {right.identity.commonName.toLocaleLowerCase("ca")}</h2>
        <div className="comparison-facts-table">
          <header><span>Criteri</span><strong>{left.identity.commonName}</strong><strong>{right.identity.commonName}</strong></header>
          {rows.map(([label, leftValue, rightValue]) => <div key={label}><span>{label}</span><p>{leftValue}</p><p>{rightValue}</p></div>)}
        </div>
      </section>

      <div className="comparison-actions">
        <Link href={speciesPath(left)} className="text-link">Fitxa de {left.identity.commonName} <ArrowUpRight size={16} /></Link>
        <Link href={`/compare?left=${left.speciesId}&right=${right.speciesId}`} className="button moss-button">Obrir el comparador complet <ArrowRightLeft size={16} /></Link>
        <Link href={speciesPath(right)} className="text-link">Fitxa de {right.identity.commonName} <ArrowUpRight size={16} /></Link>
      </div>

      <aside className="intent-emergency-note comparison-warning">
        <CircleAlert size={22} /><div><strong>{page.confusionRisk ? "Què hi ha en joc" : "No decidiu el consum amb una taula."}</strong><p>{page.confusionRisk ?? "La variació natural, l’edat i l’estat del bolet poden alterar-ne l’aspecte. Confirmeu qualsevol identificació amb una persona experta."}</p></div>
      </aside>
      <EditorialAttribution contentId={`compare:${page.slug}`} sources={[officialSafetySource, ...left.references, ...right.references]} />
    </PageShell>
  );
}
