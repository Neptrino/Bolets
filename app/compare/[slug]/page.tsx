import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightLeft, ArrowUpRight, CircleAlert } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { comparisonPages, comparisonPagesBySlug } from "@/data/comparison-pages";
import { getSpecies } from "@/data/species";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";
import { SEASON_MONTHS } from "@/src/lib/seasonality";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";
import type { SpeciesProfile } from "@/src/lib/types";

export function generateStaticParams() {
  return comparisonPages.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = comparisonPagesBySlug[slug];
  if (!page) return {};

  return {
    title: page.title,
    description: `${page.introduction} ${page.decisiveDifference}`,
    keywords: page.searchTerms,
    alternates: { canonical: `/compare/${page.slug}` },
    openGraph: {
      url: `/compare/${page.slug}`,
      title: page.title,
      description: page.decisiveDifference,
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
    <div className="comparison-landing page-width">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: page.shortTitle,
        url: absoluteUrl(`/compare/${page.slug}`),
        inLanguage: "ca",
        description: page.introduction,
        about: [
          { "@type": "Thing", name: left.identity.scientificName },
          { "@type": "Thing", name: right.identity.scientificName },
        ],
      }} />
      <Link href="/compare" className="back-link">← Totes les comparacions</Link>
      <header className="comparison-landing-hero">
        <p className="eyebrow"><ArrowRightLeft size={15} /> Guia comparativa</p>
        <h1>{left.identity.commonName} <i>vs</i> {right.identity.commonName.toLocaleLowerCase("ca")}</h1>
        <p>{page.introduction}</p>
      </header>

      <aside className="comparison-answer">
        <CircleAlert size={22} aria-hidden="true" />
        <div><span>Diferència clau</span><strong>{page.decisiveDifference}</strong></div>
      </aside>

      <section className="comparison-facts" aria-labelledby="comparison-facts-title">
        <h2 id="comparison-facts-title">Diferències entre {left.identity.commonName.toLocaleLowerCase("ca")} i {right.identity.commonName.toLocaleLowerCase("ca")}</h2>
        <div className="comparison-facts-table">
          <header><span>Criteri</span><strong>{left.identity.commonName}</strong><strong>{right.identity.commonName}</strong></header>
          {rows.map(([label, leftValue, rightValue]) => <div key={label}><span>{label}</span><p>{leftValue}</p><p>{rightValue}</p></div>)}
        </div>
      </section>

      <div className="comparison-actions">
        <Link href={`/species/${left.speciesId}`} className="text-link">Fitxa de {left.identity.commonName} <ArrowUpRight size={16} /></Link>
        <Link href={`/compare?left=${left.speciesId}&right=${right.speciesId}`} className="button moss-button">Obrir el comparador complet <ArrowRightLeft size={16} /></Link>
        <Link href={`/species/${right.speciesId}`} className="text-link">Fitxa de {right.identity.commonName} <ArrowUpRight size={16} /></Link>
      </div>

      <aside className="intent-emergency-note comparison-warning">
        <CircleAlert size={22} /><div><strong>No decideixis el consum amb una taula.</strong><p>La variació natural, l’edat i l’estat del bolet poden alterar-ne l’aspecte. Confirma qualsevol identificació amb una persona experta.</p></div>
      </aside>
    </div>
  );
}
